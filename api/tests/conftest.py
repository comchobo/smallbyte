from collections.abc import AsyncIterator
from uuid import uuid4

import psycopg
import pytest_asyncio
from psycopg import sql
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlmodel import SQLModel

from app.config import get_settings


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
