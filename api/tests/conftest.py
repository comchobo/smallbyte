import json
from collections.abc import AsyncIterator
from datetime import timedelta
from pathlib import Path
from uuid import uuid4

import httpx
import psycopg
import pytest_asyncio
from psycopg import sql
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import get_settings
from app.db import get_session
from app.main import app
from app.models import LoginSession, Task, User
from app.models.learning import now
from app.services import auth


@pytest_asyncio.fixture(scope="session")
async def test_engine() -> AsyncIterator[AsyncEngine]:
    settings = get_settings()
    name = f"smallbyte_test_{uuid4().hex}"
    async with await psycopg.AsyncConnection.connect(
        host=settings.postgres_host,
        port=settings.postgres_port,
        user=settings.postgres_user,
        password=settings.postgres_password.get_secret_value(),
        dbname="postgres",
        autocommit=True,
    ) as admin:
        await admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
        engine = create_async_engine(settings.database_url.set(database=name))
        try:
            async with engine.begin() as connection:
                await connection.run_sync(SQLModel.metadata.create_all)
            yield engine
        finally:
            await engine.dispose()
            await admin.execute(
                sql.SQL("DROP DATABASE {} WITH (FORCE)").format(sql.Identifier(name))
            )


@pytest_asyncio.fixture
async def account(test_engine):
    async with AsyncSession(test_engine, expire_on_commit=False) as db:
        for path in Path("app/content").glob("*.json"):
            content = json.loads(path.read_text())
            if await db.get(Task, content["id"]) is None:
                db.add(
                    Task(id=content["id"], version=content["version"], content=content)
                )
        user = User(
            github_id=uuid4().int % 10**12,
            handle="learner",
            name="학습자",
            purpose="basics",
            goal="cs",
            experience="beginner",
        )
        db.add(user)
        await db.flush()
        token = uuid4().hex
        db.add(
            LoginSession(
                token_hash=auth.digest(token),
                user_id=user.id,
                expires_at=now() + timedelta(days=30),
            )
        )
        await db.commit()
        return user, token


@pytest_asyncio.fixture
async def client(test_engine, account):
    async def session():
        async with AsyncSession(test_engine, expire_on_commit=False) as db:
            yield db

    app.dependency_overrides[get_session] = session
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url=get_settings().app_origin,
        headers={"Origin": get_settings().app_origin},
        cookies={auth.COOKIE: account[1]},
    ) as client:
        yield client
    app.dependency_overrides.clear()
