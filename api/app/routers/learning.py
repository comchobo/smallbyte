from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db import get_session
from app.models import Task, User
from app.repositories import learning as repository
from app.schemas.learning import Answer, ProfileUpdate, StartAttempt, Submission
from app.services import auth, learning

router = APIRouter()
Database = Annotated[AsyncSession, Depends(get_session)]


async def get_user(request: Request, db: Database) -> User:
    return await auth.current_user(request, db)


Account = Annotated[User, Depends(get_user)]


@router.get("/auth/github")
async def github(db: Database):
    return await auth.begin(db)


@router.get("/auth/github/callback")
async def callback(request: Request, db: Database):
    return await auth.callback(request, db)


@router.post("/auth/logout")
async def logout(request: Request, db: Database):
    await auth.logout(request, db)
    response = Response(status_code=204)
    response.delete_cookie(auth.COOKIE, path="/")
    return response


@router.get("/me")
async def me(user: Account):
    return learning.profile(user)


@router.patch("/me")
async def update_me(data: ProfileUpdate, user: Account, db: Database):
    return await learning.update_profile(db, user, data)


@router.get("/tasks")
async def tasks(db: Database):
    return [t.content for t in await repository.tasks(db)]


@router.get("/tasks/{task_id}")
async def task(task_id: str, db: Database):
    task = await db.get(Task, task_id)
    if task is None:
        raise HTTPException(404, "과제를 찾을 수 없습니다.")
    return task.content


@router.get("/dashboard")
async def dashboard(user: Account, db: Database):
    return await learning.dashboard(db, user)


@router.post("/attempts")
async def start(data: StartAttempt, user: Account, db: Database):
    return await learning.start(db, user, data.task_id)


@router.get("/attempts/{attempt_id}")
async def attempt(attempt_id: str, user: Account, db: Database):
    return await learning.detail(db, user, attempt_id)


@router.post("/attempts/{attempt_id}/submission")
async def submit(attempt_id: str, data: Submission, user: Account, db: Database):
    return await learning.run_assessment(db, user, attempt_id, submission=data.repo)


@router.post("/attempts/{attempt_id}/messages")
async def answer(attempt_id: str, data: Answer, user: Account, db: Database):
    return await learning.run_assessment(db, user, attempt_id, answer=data)


@router.post("/attempts/{attempt_id}/retry")
async def retry(attempt_id: str, user: Account, db: Database):
    return await learning.run_assessment(db, user, attempt_id, retry=True)


@router.get("/history")
async def history(
    user: Account,
    db: Database,
    q: str = Query(default="", max_length=100),
    outcome: Literal["pass", "fail"] | None = None,
    page: int = Query(default=1, ge=1),
):
    return await learning.history(db, user, q, outcome, page)


@router.get("/activity")
async def activity(user: Account, db: Database):
    return await learning.activity(db, user)
