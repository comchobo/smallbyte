from datetime import datetime
from typing import Any

from fastapi import HTTPException
from sqlalchemy import func
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel.sql.expression import Select

from app.models import ActivityEvent, Attempt, Message, Operation, Task, User


async def lock_user(db: AsyncSession, user_id: str) -> User:
    result = await db.exec(select(User).where(User.id == user_id).with_for_update())
    user = result.one_or_none()
    if user is None:
        raise HTTPException(401, "다시 로그인해 주세요.")
    return user


async def owned(db: AsyncSession, user_id: str, attempt_id: str) -> Attempt:
    attempt = await db.get(Attempt, attempt_id)
    if attempt is None or attempt.user_id != user_id:
        raise HTTPException(404, "과제 기록을 찾을 수 없습니다.")
    return attempt


async def messages(db: AsyncSession, attempt_id: str) -> list[Message]:
    return list(
        await db.exec(
            select(Message)
            .where(Message.attempt_id == attempt_id)
            .order_by(col(Message.sequence))
        )
    )


async def latest_operation(db: AsyncSession, attempt_id: str) -> Operation | None:
    return (
        await db.exec(
            select(Operation)
            .where(Operation.attempt_id == attempt_id)
            .order_by(col(Operation.created_at).desc())
            .limit(1)
        )
    ).first()


async def tasks(db: AsyncSession) -> list[Task]:
    return list(await db.exec(select(Task)))


async def attempts(db: AsyncSession, user_id: str) -> list[Attempt]:
    return list(
        await db.exec(
            select(Attempt)
            .where(Attempt.user_id == user_id)
            .order_by(col(Attempt.created_at).desc())
        )
    )


async def active(db: AsyncSession, user_id: str) -> Attempt | None:
    return (
        await db.exec(
            select(Attempt).where(
                Attempt.user_id == user_id, Attempt.status != "completed"
            )
        )
    ).first()


async def event(db: AsyncSession, user_id: str, key: str, kind: str) -> None:
    if (
        await db.exec(select(ActivityEvent).where(ActivityEvent.event_key == key))
    ).first() is None:
        db.add(ActivityEvent(user_id=user_id, event_key=key, kind=kind))


async def recent_operations(db: AsyncSession, user_id: str, since) -> int:
    return (
        await db.exec(
            select(func.count())
            .select_from(Operation)
            .where(Operation.user_id == user_id, Operation.created_at > since)
        )
    ).one()


async def leaderboard(
    db: AsyncSession, start: datetime, end: datetime
) -> list[dict[str, Any]]:
    count = func.count(col(ActivityEvent.id))
    ranked = (
        Select(
            col(User.id),
            col(User.name),
            col(User.handle),
            count.label("count"),
            func.rank().over(order_by=count.desc()).label("rank"),
        )
        .join(ActivityEvent, col(ActivityEvent.user_id) == col(User.id))
        .where(
            col(ActivityEvent.created_at) >= start,
            col(ActivityEvent.created_at) <= end,
        )
        .group_by(col(User.id))
        .subquery()
    )
    rows = await db.exec(
        Select(ranked)
        .where(ranked.c.rank <= 50)
        .order_by(ranked.c.rank, func.lower(ranked.c.handle), ranked.c.id)
    )
    return [
        {"id": id, "name": name, "handle": handle, "count": count, "rank": rank}
        for id, name, handle, count, rank in rows
    ]
