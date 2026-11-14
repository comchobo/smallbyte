from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db import engine
from app.routers import health


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
