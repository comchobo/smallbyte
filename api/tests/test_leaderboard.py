from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import ActivityEvent, User
from app.services import learning


def learner(handle: str) -> User:
    return User(
        github_id=uuid4().int % 10**12,
        handle=handle,
        name=f"학습자 {handle}",
        default_repo="https://github.com/private/repository",
        purpose="basics",
    )


def event(user: User, at: datetime, kind: str = "start") -> ActivityEvent:
    return ActivityEvent(
        user_id=user.id, event_key=uuid4().hex, kind=kind, created_at=at
    )


async def test_leaderboard_requires_login(client):
    client.cookies.clear()
    response = await client.get("/api/leaderboard")
    assert response.status_code == 401


async def test_leaderboard_empty(client, monkeypatch):
    monkeypatch.setattr(learning, "now", lambda: datetime(2050, 1, 1, tzinfo=UTC))
    response = await client.get("/api/leaderboard")
    assert response.status_code == 200
    assert response.json() == {
        "start": "2049-12-26",
        "today": "2050-01-01",
        "items": [],
    }


async def test_leaderboard_window_counts_ties_and_public_fields(
    client, test_engine, monkeypatch
):
    # 16:00 UTC is already the next day in Seoul.
    end = datetime(2040, 1, 7, 16, tzinfo=UTC)
    start = datetime(2040, 1, 1, 15, tzinfo=UTC)
    monkeypatch.setattr(learning, "now", lambda: end)
    alpha, beta, gamma, inactive = [
        learner(handle) for handle in ("Alpha", "beta", "gamma", "inactive")
    ]
    async with AsyncSession(test_engine, expire_on_commit=False) as db:
        db.add_all([alpha, beta, gamma, inactive])
        await db.flush()
        db.add_all(
            [
                event(alpha, start, "start"),
                event(alpha, end, "submit"),
                event(beta, end - timedelta(hours=1), "message"),
                event(beta, end, "complete"),
                event(gamma, end),
                event(gamma, start - timedelta(microseconds=1)),
                event(gamma, end + timedelta(microseconds=1)),
                event(inactive, start - timedelta(days=1)),
            ]
        )
        await db.commit()

    response = await client.get("/api/leaderboard")
    assert response.status_code == 200
    data = response.json()
    assert (data["start"], data["today"]) == ("2040-01-02", "2040-01-08")
    assert data["items"] == [
        {
            "id": user.id,
            "name": user.name,
            "handle": user.handle,
            "count": count,
            "rank": rank,
        }
        for user, count, rank in [(alpha, 2, 1), (beta, 2, 1), (gamma, 1, 3)]
    ]


async def test_leaderboard_includes_all_ties_at_fiftieth_place(
    client, test_engine, monkeypatch
):
    end = datetime(2041, 1, 7, tzinfo=UTC)
    monkeypatch.setattr(learning, "now", lambda: end)
    async with AsyncSession(test_engine) as db:
        users = [learner(f"learner-{index:02}") for index in range(53)]
        db.add_all(users)
        await db.flush()
        for index, user in enumerate(users):
            count = 3 if index < 49 else 2 if index < 52 else 1
            db.add_all([event(user, end) for _ in range(count)])
        await db.commit()

    response = await client.get("/api/leaderboard")
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 52
    assert [item["rank"] for item in items] == [1] * 49 + [50] * 3
    assert [item["handle"] for item in items[-3:]] == [
        "learner-49",
        "learner-50",
        "learner-51",
    ]
