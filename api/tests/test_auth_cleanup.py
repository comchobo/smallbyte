from datetime import timedelta

from sqlalchemy import delete
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import get_settings
from app.models import LoginSession, OAuthState
from app.models.learning import now


async def test_login_start_prunes_expired_auth_rows(
    client, account, monkeypatch, test_engine
):
    settings = get_settings()
    monkeypatch.setattr(settings, "github_client_id", "test-client")
    monkeypatch.setattr(
        settings,
        "github_client_secret",
        type(settings.github_client_secret)("test-secret"),
    )
    async with AsyncSession(test_engine) as db:
        await db.exec(delete(OAuthState))
        db.add(
            OAuthState(
                state_hash="expired-state",
                browser_hash="expired-browser",
                expires_at=now() - timedelta(minutes=1),
            )
        )
        db.add(
            OAuthState(
                state_hash="live-state",
                browser_hash="live-browser",
                expires_at=now() + timedelta(minutes=10),
            )
        )
        db.add(
            LoginSession(
                token_hash="expired-session",
                user_id=account[0].id,
                expires_at=now() - timedelta(minutes=1),
            )
        )
        db.add(
            LoginSession(
                token_hash="live-session",
                user_id=account[0].id,
                expires_at=now() + timedelta(minutes=10),
            )
        )
        await db.commit()

    first = await client.get("/api/auth/github")
    assert first.status_code == 303
    async with AsyncSession(test_engine) as db:
        assert await db.get(OAuthState, "expired-state") is None
        assert await db.get(LoginSession, "expired-session") is None
        assert await db.get(OAuthState, "live-state") is not None
        assert await db.get(LoginSession, "live-session") is not None

    second = await client.get("/api/auth/github")
    assert second.status_code == 303
    async with AsyncSession(test_engine) as db:
        await db.exec(delete(OAuthState))
        live_session = await db.get(LoginSession, "live-session")
        if live_session is not None:
            await db.delete(live_session)
        await db.commit()
