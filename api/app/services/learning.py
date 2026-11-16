import asyncio
import logging
from collections import Counter
from datetime import datetime, time, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import get_settings
from app.models import ActivityEvent, Attempt, Message, Operation, Task, User
from app.models.learning import now
from app.repositories import learning as repo
from app.schemas.learning import Answer, ProfileUpdate
from app.services import providers

logger = logging.getLogger(__name__)
ACTIVITY_WEEKS = 26


def profile(user: User) -> dict[str, Any]:
    return {
        **user.model_dump(),
        "onboarding_complete": bool(user.purpose and user.goal and user.experience),
    }


async def update_profile(
    db: AsyncSession, user: User, data: ProfileUpdate
) -> dict[str, Any]:
    user = await repo.lock_user(db, user.id)
    values = data.model_dump(exclude_none=True)
    if "name" in values:
        values["name"] = values["name"].strip()
        if not values["name"]:
            raise HTTPException(422, "이름을 입력해 주세요.")
    if "default_repo" in values:
        values["default_repo"] = providers.repository_url(
            values["default_repo"], optional=True
        )
    for key, value in values.items():
        setattr(user, key, value)
    db.add(user)
    await db.commit()
    return profile(user)


def ranking(user: User) -> list[str]:
    if (
        user.experience == "beginner"
        or user.goal == "cs"
        or user.purpose in {"basics", "school"}
    ):
        return ["dns", "http", "cache", "session"]
    if user.goal == "frontend":
        return ["http", "session", "cache", "dns"]
    if user.goal == "reliability":
        return ["dns", "cache", "http", "session"]
    return ["http", "dns", "session", "cache"]


async def dashboard(db: AsyncSession, user: User) -> dict[str, Any]:
    all_attempts = await repo.attempts(db, user.id)
    passed = list({a.task_id for a in all_attempts if a.outcome == "pass"})
    active = next((a for a in all_attempts if a.status != "completed"), None)
    order = ranking(user)
    return {
        "order": order,
        "passed": passed,
        "active": active.model_dump() if active else None,
        "recommended": active.task_id
        if active
        else next((i for i in order if i not in passed), None),
        "reason": (
            "관심 분야와 경험을 반영한 추천입니다. 순서는 자유롭게 선택할 수 있으며 "
            "통과한 과제는 다음 추천에서 제외합니다."
        ),
    }


async def start(db: AsyncSession, user: User, task_id: str) -> dict[str, Any]:
    user = await repo.lock_user(db, user.id)
    if not profile(user)["onboarding_complete"]:
        raise HTTPException(409, "먼저 학습 방향을 설정해 주세요.")
    task = await db.get(Task, task_id)
    if task is None:
        raise HTTPException(404, "과제를 찾을 수 없습니다.")
    current = await repo.active(db, user.id)
    if current:
        if current.task_id != task_id:
            raise HTTPException(409, "진행 중인 과제를 마친 뒤 시작할 수 있습니다.")
        await db.commit()
        return await detail(db, user, current.id)
    attempt = Attempt(
        user_id=user.id,
        task_id=task_id,
        repo=user.default_repo,
        task_snapshot=task.content,
    )
    db.add(attempt)
    await db.flush()
    await repo.event(db, user.id, "start:" + attempt.id, "start")
    await db.commit()
    return await detail(db, user, attempt.id)


async def detail(db: AsyncSession, user: User, attempt_id: str) -> dict[str, Any]:
    attempt = await repo.owned(db, user.id, attempt_id)
    operation = await repo.latest_operation(db, attempt.id)
    operation_data = None
    if operation:
        operation_data = {
            "id": operation.id,
            "status": operation.status,
            "error": operation.error,
        }
        if operation.status == "running" and operation.expires_at <= now():
            operation_data.update(
                status="failed", error="이전 요청이 중단되었습니다. 다시 시도해 주세요."
            )
    return {
        **attempt.model_dump(),
        "messages": [m.model_dump() for m in await repo.messages(db, attempt.id)],
        "operation": operation_data,
    }


def _user_turns(transcript: list[Message]) -> int:
    return sum(m.role == "user" for m in transcript)


def _duplicate_answer(transcript: list[Message], answer: Answer) -> Message | None:
    replay = next((m for m in transcript if m.request_key == answer.request_key), None)
    if replay is None:
        return None
    if (
        replay.content != answer.content.strip()
        or transcript[replay.sequence - 1].id != answer.question_id
    ):
        raise HTTPException(409, "같은 요청 키에 다른 답변을 보낼 수 없습니다.")
    return replay


def _expire_previous_operation(previous: Operation | None) -> Operation | None:
    if previous is None or previous.status != "running":
        return None
    if previous.expires_at > now():
        raise HTTPException(409, "이전 응답을 기다리고 있습니다.")
    previous.status = "failed"
    previous.error = "요청이 중단되었습니다."
    return previous


def _validate_operation_choice(
    previous: Operation | None,
    attempt: Attempt,
    *,
    submission: str | None,
    retry: bool,
) -> None:
    if retry:
        if previous is None or previous.status != "failed":
            raise HTTPException(409, "재시도할 요청이 없습니다.")
    elif previous and previous.status == "failed":
        # A repository read failure may be fixed by changing the URL. Once a
        # snapshot exists, only retry the pending AI operation.
        if attempt.files or submission is None:
            raise HTTPException(409, "먼저 실패한 요청을 다시 시도해 주세요.")


def _apply_submission(attempt: Attempt, submission: str | None) -> None:
    if submission is None:
        return
    if attempt.files:
        raise HTTPException(409, "제출 자료를 이미 읽었습니다. 대화를 이어가세요.")
    attempt.repo = providers.repository_url(submission)


def _validate_answer(
    attempt: Attempt, transcript: list[Message], answer: Answer
) -> None:
    if (
        attempt.status != "chatting"
        or not transcript
        or transcript[-1].role != "assistant"
    ):
        raise HTTPException(409, "AI 질문을 받은 뒤 답변해 주세요.")
    if not answer.content.strip():
        raise HTTPException(422, "답변을 입력해 주세요.")
    if transcript[-1].id != answer.question_id:
        raise HTTPException(
            409,
            "다른 기기에서 대화가 진행됐습니다. "
            "최신 질문을 확인하고 다시 답변해 주세요.",
        )
    if _user_turns(transcript) >= 10:
        raise HTTPException(409, "최종 평가를 다시 시도해 주세요.")


def _ensure_operation_running(operation: Operation) -> None:
    if operation.status != "running" or operation.expires_at <= now():
        raise HTTPException(409, "요청이 만료되었습니다. 다시 시도하세요.")


async def run_assessment(
    db: AsyncSession,
    user: User,
    attempt_id: str,
    *,
    submission: str | None = None,
    answer: Answer | None = None,
    retry: bool = False,
) -> dict[str, Any]:
    settings = get_settings()
    await repo.lock_user(db, user.id)
    attempt = await repo.owned(db, user.id, attempt_id)
    transcript = await repo.messages(db, attempt.id)
    if answer and _duplicate_answer(transcript, answer):
        await db.commit()
        return await detail(db, user, attempt.id)
    if attempt.status == "completed":
        raise HTTPException(409, "이미 완료된 평가입니다.")
    previous = await repo.latest_operation(db, attempt.id)
    expired = _expire_previous_operation(previous)
    if expired:
        db.add(expired)
    _validate_operation_choice(previous, attempt, submission=submission, retry=retry)
    _apply_submission(attempt, submission)
    if answer:
        _validate_answer(attempt, transcript, answer)
    if (
        await repo.recent_operations(db, user.id, now() - timedelta(minutes=1))
        >= settings.ai_requests_per_minute
    ):
        raise HTTPException(429, "요청이 많습니다. 잠시 후 다시 시도하세요.")
    if answer:
        message = Message(
            attempt_id=attempt.id,
            sequence=len(transcript),
            role="user",
            content=answer.content.strip(),
            request_key=answer.request_key,
        )
        db.add(message)
        transcript.append(message)
    operation = Operation(
        user_id=user.id,
        attempt_id=attempt.id,
        expires_at=now()
        + timedelta(seconds=settings.github_timeout + settings.ai_timeout * 2 + 30),
    )
    db.add(operation)
    db.add(attempt)
    await db.commit()
    user_id, operation_id = user.id, operation.id
    try:
        if not attempt.files:
            files = await asyncio.wait_for(
                providers.read_repository(attempt.repo, attempt.task_snapshot),
                timeout=settings.github_timeout,
            )
            await repo.lock_user(db, user.id)
            await db.refresh(operation)
            _ensure_operation_running(operation)
            attempt.files = files
            attempt.status = "chatting"
            db.add(attempt)
            await repo.event(db, user.id, "submission:" + attempt.id, "submission")
            await db.commit()
        payload = [{"role": m.role, "content": m.content} for m in transcript]
        reply = await providers.assess(
            attempt.task_snapshot,
            attempt.files,
            payload,
            _user_turns(transcript),
        )
        await repo.lock_user(db, user.id)
        await db.refresh(operation)
        await db.refresh(attempt)
        _ensure_operation_running(operation)
        db.add(
            Message(
                attempt_id=attempt.id,
                sequence=len(transcript),
                role="assistant",
                content=reply.message,
            )
        )
        attempt.progress = list(dict.fromkeys([*attempt.progress, *reply.checked]))
        attempt.model = settings.ollama_model
        if reply.action != "question":
            attempt.status = "completed"
            attempt.outcome = reply.action
            attempt.result = reply.model_dump()
            attempt.completed_at = now()
            await repo.event(db, user.id, "finish:" + attempt.id, "finish")
        operation.status = "succeeded"
        db.add(operation)
        db.add(attempt)
        await repo.event(db, user.id, "reply:" + operation.id, "reply")
        await db.commit()
    except Exception as exc:
        await db.rollback()
        await repo.lock_user(db, user_id)
        await db.refresh(operation)
        if operation.status == "running":
            operation.status = "failed"
            operation.error = (
                str(exc.detail)
                if isinstance(exc, HTTPException)
                else "요청을 완료하지 못했습니다. 저장된 상태에서 다시 시도하세요."
            )
            db.add(operation)
            await db.commit()
        if isinstance(exc, HTTPException):
            raise
        if not isinstance(exc, TimeoutError):
            logger.exception("Assessment operation failed: %s", operation_id)
        raise HTTPException(
            502, "요청을 완료하지 못했습니다. 다시 시도해 주세요."
        ) from exc
    return await detail(db, user, attempt.id)


async def history(
    db: AsyncSession, user: User, query: str, outcome: str | None, page: int
) -> dict[str, Any]:
    records = [
        a
        for a in await repo.attempts(db, user.id)
        if a.status == "completed"
        and (not outcome or a.outcome == outcome)
        and query.casefold() in a.task_snapshot["title"].casefold()
    ]
    records.sort(key=lambda a: a.completed_at or a.created_at, reverse=True)
    return {
        "total": len(records),
        "page": page,
        "items": [
            {
                "id": a.id,
                "task_id": a.task_id,
                "title": a.task_snapshot["title"],
                "concept": a.task_snapshot["concept"],
                "outcome": a.outcome,
                "completed_at": a.completed_at,
            }
            for a in records[(page - 1) * 20 : page * 20]
        ],
    }


async def activity(db: AsyncSession, user: User) -> dict[str, Any]:
    zone = ZoneInfo("Asia/Seoul")
    today = now().astimezone(zone).date()
    days_since_sunday = (today.weekday() + 1) % 7
    start_date = today - timedelta(days=days_since_sunday, weeks=ACTIVITY_WEEKS - 1)
    events = await db.exec(
        select(ActivityEvent).where(
            ActivityEvent.user_id == user.id,
            ActivityEvent.created_at >= now() - timedelta(days=183),
        )
    )
    counts = Counter(e.created_at.astimezone(zone).date().isoformat() for e in events)
    days = []
    for offset in range(ACTIVITY_WEEKS * 7):
        date = (start_date + timedelta(days=offset)).isoformat()
        days.append({"date": date, "count": counts[date]})
    return {"start": start_date, "today": today, "days": days}


async def leaderboard(db: AsyncSession) -> dict[str, Any]:
    zone = ZoneInfo("Asia/Seoul")
    end = now()
    today = end.astimezone(zone).date()
    start = datetime.combine(today - timedelta(days=6), time.min, tzinfo=zone)
    return {
        "start": start.date(),
        "today": today,
        "items": await repo.leaderboard(db, start, end),
    }
