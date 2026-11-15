FROM python:3.13-slim-bookworm AS base
COPY --from=ghcr.io/astral-sh/uv:0.13.7 /uv /uvx /bin/
WORKDIR /app
ENV UV_PROJECT_ENVIRONMENT=/opt/venv
ENV UV_LINK_MODE=copy
ENV PATH=/opt/venv/bin:$PATH
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
COPY pyproject.toml uv.lock ./

FROM base AS development
RUN uv sync --locked
COPY . .
CMD ["sh", "-c", "uv run --locked alembic upgrade head && exec uv run --locked uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]

FROM base AS build
RUN uv sync --locked --no-dev

FROM python:3.13-slim-bookworm AS production
WORKDIR /app
ENV PATH=/opt/venv/bin:$PATH
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
RUN useradd --create-home app
COPY --from=build /opt/venv /opt/venv
COPY --chown=app:app app ./app
COPY --chown=app:app alembic ./alembic
COPY --chown=app:app alembic.ini ./
USER app
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'"]
