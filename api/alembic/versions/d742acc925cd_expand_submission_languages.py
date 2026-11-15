"""Accept language-free UTF-8 submissions while preserving prior attempt snapshots."""

import json
from pathlib import Path

import sqlalchemy as sa

from alembic import op

revision = "d742acc925cd"
down_revision = "c93dc756406f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    tasks = sa.table(
        "tasks",
        sa.column("id", sa.String),
        sa.column("version", sa.Integer),
        sa.column("content", sa.JSON),
    )
    content_dir = Path(__file__).resolve().parents[2] / "app" / "content"
    for task_id in ("dns", "http", "cache", "session"):
        content = json.loads((content_dir / f"{task_id}.json").read_text())
        op.execute(
            tasks.update()
            .where(tasks.c.id == task_id)
            .values(version=content["version"], content=content)
        )


def downgrade() -> None:
    # Content v2 is backwards-compatible; historical attempt snapshots are immutable.
    pass
