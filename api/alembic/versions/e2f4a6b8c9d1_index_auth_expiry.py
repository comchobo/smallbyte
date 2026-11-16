"""Index authentication row expiry for pruning

Revision ID: e2f4a6b8c9d1
Revises: d742acc925cd
"""

from alembic import op

revision = "e2f4a6b8c9d1"
down_revision = "d742acc925cd"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_oauth_states_expires_at", "oauth_states", ["expires_at"], unique=False
    )
    op.create_index("ix_sessions_expires_at", "sessions", ["expires_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_sessions_expires_at", table_name="sessions")
    op.drop_index("ix_oauth_states_expires_at", table_name="oauth_states")
