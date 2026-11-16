import hashlib
import secrets
from datetime import timedelta
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import get_settings
from app.models import LoginSession, OAuthState, User
from app.models.learning import identifier, now

COOKIE = "smallbyte_session"
STATE_COOKIE = "smallbyte_oauth"


def digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def current_user(request: Request, db: AsyncSession) -> User:
    session = await db.get(LoginSession, digest(request.cookies.get(COOKIE, "")))
    if session is None or session.expires_at <= now():
        raise HTTPException(401, "로그인이 필요합니다.")
    user = await db.get(User, session.user_id)
    if user is None:
        raise HTTPException(401, "로그인이 필요합니다.")
    return user


async def begin(db: AsyncSession) -> RedirectResponse:
    settings = get_settings()
    if (
        not settings.github_client_id
        or not settings.github_client_secret.get_secret_value()
    ):
        raise HTTPException(503, "GitHub 로그인 설정이 필요합니다.")
    await db.exec(delete(OAuthState).where(col(OAuthState.expires_at) <= now()))
    await db.exec(delete(LoginSession).where(col(LoginSession.expires_at) <= now()))
    state, browser = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    db.add(
        OAuthState(
            state_hash=digest(state),
            browser_hash=digest(browser),
            expires_at=now() + timedelta(minutes=10),
        )
    )
    await db.commit()
    params = urlencode(
        {
            "client_id": settings.github_client_id,
            "redirect_uri": settings.app_origin + "/api/auth/github/callback",
            "state": state,
            "scope": "read:user",
        }
    )
    response = RedirectResponse(
        "https://github.com/login/oauth/authorize?" + params, 303
    )
    response.set_cookie(
        STATE_COOKIE,
        browser,
        httponly=True,
        secure=settings.secure_cookies,
        samesite="lax",
        max_age=600,
        path="/api/auth",
    )
    return response


async def callback(request: Request, db: AsyncSession) -> RedirectResponse:
    settings = get_settings()
    response = RedirectResponse(settings.app_origin + "/login?auth=failed", 303)
    response.delete_cookie(STATE_COOKIE, path="/api/auth")
    state = request.query_params.get("state", "")
    # Lock the one-time state so simultaneous callbacks cannot consume it twice.
    entry = (
        await db.exec(
            select(OAuthState)
            .where(OAuthState.state_hash == digest(state))
            .with_for_update()
        )
    ).first()
    if (
        entry is None
        or entry.expires_at <= now()
        or not secrets.compare_digest(
            entry.browser_hash, digest(request.cookies.get(STATE_COOKIE, ""))
        )
    ):
        await db.rollback()
        return response
    await db.delete(entry)
    await db.commit()
    if request.query_params.get("error") or not request.query_params.get("code"):
        return response
    try:
        async with httpx.AsyncClient(timeout=settings.github_timeout) as client:
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={"Accept": "application/json"},
                data={
                    "client_id": settings.github_client_id,
                    "client_secret": settings.github_client_secret.get_secret_value(),
                    "code": request.query_params["code"],
                    "redirect_uri": settings.app_origin + "/api/auth/github/callback",
                },
            )
            token_response.raise_for_status()
            token = token_response.json().get("access_token")
            if not token:
                return response
            identity = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": "Bearer " + token,
                    "Accept": "application/vnd.github+json",
                },
            )
            identity.raise_for_status()
            body = identity.json()
        # OAuth tokens are deliberately not persisted; submissions are public only.
        statement = (
            insert(User)
            .values(
                id=identifier(),
                github_id=body["id"],
                handle=body["login"],
                name=(body.get("name") or body["login"])[:30],
                purpose="",
                goal="",
                experience="",
                default_repo="",
            )
            .on_conflict_do_update(
                index_elements=["github_id"], set_={"handle": body["login"]}
            )
            .returning(col(User.id))
        )
        user_id = (await db.exec(statement)).one()[0]
        raw = secrets.token_urlsafe(48)
        db.add(
            LoginSession(
                token_hash=digest(raw),
                user_id=user_id,
                expires_at=now() + timedelta(days=settings.session_days),
            )
        )
        await db.commit()
        response = RedirectResponse(settings.app_origin + "/home", 303)
        response.delete_cookie(STATE_COOKIE, path="/api/auth")
        response.set_cookie(
            COOKIE,
            raw,
            max_age=settings.session_days * 86400,
            secure=settings.secure_cookies,
            httponly=True,
            samesite="lax",
            path="/",
        )
        return response
    except (httpx.HTTPError, KeyError, ValueError):
        await db.rollback()
        return response


async def logout(request: Request, db: AsyncSession) -> None:
    session = await db.get(LoginSession, digest(request.cookies.get(COOKIE, "")))
    if session:
        await db.delete(session)
        await db.commit()
