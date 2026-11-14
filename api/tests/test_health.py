from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import get_settings
from app.db import get_session
from app.main import app


@pytest_asyncio.fixture
async def client(test_engine: AsyncEngine) -> AsyncIterator[AsyncClient]:
    async def session() -> AsyncIterator[AsyncSession]:
        async with AsyncSession(test_engine) as value:
            yield value

    app.dependency_overrides[get_session] = session
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as value:
            yield value
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_health_with_database(client: AsyncClient):
    for path in ("live", "ready"):
        response = await client.get(f"/api/health/{path}")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_database_failure_does_not_break_liveness(client: AsyncClient):
    unavailable = create_async_engine(
        get_settings().database_url.set(host="127.0.0.1", port=1),
        connect_args={"connect_timeout": 1},
    )

    async def session() -> AsyncIterator[AsyncSession]:
        async with AsyncSession(unavailable) as value:
            yield value

    app.dependency_overrides[get_session] = session
    try:
        response = await client.get("/api/health/ready")
        assert response.status_code == 503
        assert response.json() == {"detail": "Database unavailable"}
        assert (await client.get("/api/health/live")).status_code == 200
    finally:
        await unavailable.dispose()
