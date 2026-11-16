from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.config import get_settings
from app.db import engine
from app.routers import health, learning


class LimitRequestBody:
    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        declared = dict(scope["headers"]).get(b"content-length")
        if declared is not None:
            try:
                length = int(declared)
            except ValueError:
                length = 0
            if length > self.max_bytes:
                await self.reject(scope, receive, send)
                return
        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    raise HTTPException(413, "요청 본문이 너무 큽니다.")
            return message

        await self.app(scope, limited_receive, send)

    @staticmethod
    async def reject(scope: Scope, receive: Receive, send: Send) -> None:
        response = JSONResponse({"detail": "요청 본문이 너무 큽니다."}, status_code=413)
        await response(scope, receive, send)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(
    title="smallbyte API",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)
app.include_router(health.router, prefix="/api")
app.include_router(learning.router, prefix="/api")
app.add_middleware(LimitRequestBody, max_bytes=get_settings().request_max_bytes)


@app.middleware("http")
async def check_origin(request: Request, call_next):
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        if request.headers.get("origin") != get_settings().app_origin:
            return JSONResponse(
                {"detail": "허용되지 않은 요청 출처입니다."}, status_code=403
            )
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response
