import httpx

from app.config import get_settings
from app.main import app


async def test_oversized_body_is_rejected_before_authentication():
    limit = get_settings().request_max_bytes
    body = b'{"task_id":"' + b"a" * (limit + 1) + b'"}'
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url=get_settings().app_origin,
        headers={"Origin": get_settings().app_origin},
    ) as unavailable:
        response = await unavailable.post(
            "/api/attempts",
            content=body,
            headers={"Content-Type": "application/json"},
        )
    assert response.status_code == 413


async def test_chunked_oversized_body_is_rejected_before_authentication():
    limit = get_settings().request_max_bytes

    async def body():
        yield b'{"task_id":"'
        yield b"a" * (limit + 1)
        yield b'"}'

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url=get_settings().app_origin,
        headers={"Origin": get_settings().app_origin},
    ) as unavailable:
        response = await unavailable.post(
            "/api/attempts",
            content=body(),
            headers={"Content-Type": "application/json"},
        )
    assert response.status_code == 413
