from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import (
    JSON,
    BigInteger,
    Column,
    DateTime,
    Index,
    String,
    UniqueConstraint,
    text,
)
from sqlmodel import Field, SQLModel


def now() -> datetime:
    return datetime.now(UTC)


def identifier() -> str:
    return str(uuid4())


def timestamp():
    return Field(
        default_factory=now, sa_column=Column(DateTime(timezone=True), nullable=False)
    )


class User(SQLModel, table=True):
    __tablename__ = "users"
    id: str = Field(default_factory=identifier, primary_key=True)
    github_id: int = Field(sa_column=Column(BigInteger, unique=True, nullable=False))
    handle: str
    name: str
    purpose: str = ""
    goal: str = ""
    experience: str = ""
    default_repo: str = ""


class LoginSession(SQLModel, table=True):
    __tablename__ = "sessions"
    token_hash: str = Field(primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    expires_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )


class OAuthState(SQLModel, table=True):
    __tablename__ = "oauth_states"
    state_hash: str = Field(primary_key=True)
    browser_hash: str
    expires_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )


class Task(SQLModel, table=True):
    __tablename__ = "tasks"
    id: str = Field(primary_key=True)
    version: int
    content: dict[str, Any] = Field(sa_column=Column(JSON, nullable=False))


class Attempt(SQLModel, table=True):
    __tablename__ = "attempts"
    __table_args__ = (
        Index(
            "one_active_attempt",
            "user_id",
            unique=True,
            postgresql_where=text("status != 'completed'"),
        ),
    )
    id: str = Field(default_factory=identifier, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    task_id: str = Field(foreign_key="tasks.id")
    status: str = "working"
    repo: str = ""
    task_snapshot: dict[str, Any] = Field(sa_column=Column(JSON, nullable=False))
    files: list[dict[str, str]] = Field(
        default_factory=list, sa_column=Column(JSON, nullable=False)
    )
    progress: list[str] = Field(
        default_factory=list, sa_column=Column(JSON, nullable=False)
    )
    result: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    outcome: str | None = None
    model: str = ""
    created_at: datetime = timestamp()
    completed_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )


class Message(SQLModel, table=True):
    __tablename__ = "messages"
    __table_args__ = (
        UniqueConstraint("attempt_id", "sequence"),
        UniqueConstraint("attempt_id", "request_key"),
    )
    id: str = Field(default_factory=identifier, primary_key=True)
    attempt_id: str = Field(foreign_key="attempts.id", index=True)
    sequence: int
    role: str
    content: str
    request_key: str | None = Field(default=None, sa_column=Column(String(100)))
    created_at: datetime = timestamp()


class Operation(SQLModel, table=True):
    __tablename__ = "operations"
    id: str = Field(default_factory=identifier, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    attempt_id: str = Field(foreign_key="attempts.id", index=True)
    status: str = "running"
    error: str = ""
    created_at: datetime = timestamp()
    expires_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )


class ActivityEvent(SQLModel, table=True):
    __tablename__ = "activity_events"
    id: str = Field(default_factory=identifier, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    event_key: str = Field(unique=True)
    kind: str
    created_at: datetime = timestamp()
