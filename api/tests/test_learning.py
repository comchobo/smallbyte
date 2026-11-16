import asyncio
import base64
import json
from datetime import timedelta
from uuid import uuid4

import httpx
import pytest
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import get_settings
from app.models import Attempt, Message, Operation, User
from app.models.learning import now
from app.schemas.learning import AssessmentReply, CriterionResult
from app.services import auth, providers


async def start(client, task="http"):
    response = await client.post("/api/attempts", json={"task_id": task})
    assert response.status_code == 200, response.text
    return response.json()


async def answer_payload(client, attempt, content, key):
    saved = (await client.get(f"/api/attempts/{attempt['id']}")).json()
    return {
        "content": content,
        "request_key": key,
        "question_id": saved["messages"][-1]["id"],
    }


def fake_providers(monkeypatch, *, fail_once=False):
    calls = {"read": 0, "ai": 0}

    async def read(repo, task):
        calls["read"] += 1
        return [{"path": "experiment.py", "content": "# actual submitted source"}]

    async def assess(task, files, messages, turns):
        calls["ai"] += 1
        assert files[0]["content"] == "# actual submitted source"
        if fail_once and calls["ai"] == 2:
            raise HTTPException(502, "일시적인 AI 오류")
        ids = [r["id"] for r in task["rubric"]]
        if turns == 0:
            return AssessmentReply(
                action="question",
                message="이 코드에서 요청과 응답을 구분해 주세요.",
                checked=[],
            )
        return AssessmentReply(
            action="pass",
            message="핵심 기준을 확인했습니다.",
            checked=ids,
            criteria=[
                CriterionResult(id=i, met=True, evidence="experiment.py 및 학습자 답변")
                for i in ids
            ],
            strengths="흐름을 설명했습니다.",
            improvements="조건을 바꾸어 비교하세요.",
        )

    monkeypatch.setattr(providers, "read_repository", read)
    monkeypatch.setattr(providers, "assess", assess)
    return calls


async def test_full_lifecycle_is_persisted_and_duplicate_answer_is_idempotent(
    client, monkeypatch
):
    calls = fake_providers(monkeypatch)
    a = await start(client)
    conflict = await client.post("/api/attempts", json={"task_id": "dns"})
    assert conflict.status_code == 409
    submitted = await client.post(
        f"/api/attempts/{a['id']}/submission",
        json={"repo": "https://github.com/owner/repository"},
    )
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["files"][0]["path"] == "experiment.py"
    body = {
        "content": "요청 헤더와 응답 헤더는 방향이 다릅니다.",
        "request_key": uuid4().hex,
        "question_id": submitted.json()["messages"][-1]["id"],
    }
    result = await client.post(f"/api/attempts/{a['id']}/messages", json=body)
    assert result.status_code == 200, result.text
    assert result.json()["status"] == "completed"
    assert result.json()["outcome"] == "pass"
    assert result.json()["result"]["criteria"]
    repeated = await client.post(f"/api/attempts/{a['id']}/messages", json=body)
    assert len(repeated.json()["messages"]) == 3
    assert calls == {"read": 1, "ai": 2}
    assert (await client.get("/api/dashboard")).json()["active"] is None
    assert "http" in (await client.get("/api/dashboard")).json()["passed"]
    assert (await client.get("/api/history?outcome=pass&q=HTTP")).json()["total"] == 1
    assert (
        sum(d["count"] for d in (await client.get("/api/activity")).json()["days"]) == 5
    )
    second = await start(client)
    assert second["id"] != a["id"]


async def test_ai_failure_keeps_answer_and_retries_without_refetch_or_duplicate(
    client, monkeypatch
):
    calls = fake_providers(monkeypatch, fail_once=True)
    a = await start(client)
    await client.post(
        f"/api/attempts/{a['id']}/submission",
        json={"repo": "https://github.com/owner/repository"},
    )
    failed = await client.post(
        f"/api/attempts/{a['id']}/messages",
        json=await answer_payload(client, a, "설명", uuid4().hex),
    )
    assert failed.status_code == 502, failed.text
    saved = (await client.get(f"/api/attempts/{a['id']}")).json()
    assert saved["operation"]["status"] == "failed"
    assert saved["outcome"] is None
    assert len(saved["messages"]) == 2
    result = await client.post(f"/api/attempts/{a['id']}/retry")
    assert result.status_code == 200, result.text
    assert result.json()["outcome"] == "pass"
    assert len(result.json()["messages"]) == 3
    assert calls == {"read": 1, "ai": 3}


async def test_expired_operation_recovers_after_server_interruption(
    client, monkeypatch, test_engine
):
    fake_providers(monkeypatch)
    a = await start(client)
    async with AsyncSession(test_engine) as db:
        attempt = await db.get(Attempt, a["id"])
        assert attempt
        attempt.repo = "https://github.com/owner/repository"
        db.add(attempt)
        db.add(
            Operation(
                user_id=attempt.user_id,
                attempt_id=attempt.id,
                expires_at=now() - timedelta(seconds=1),
            )
        )
        await db.commit()
    assert (await client.get(f"/api/attempts/{a['id']}")).json()["operation"][
        "status"
    ] == "failed"
    recovered = await client.post(f"/api/attempts/{a['id']}/retry")
    assert recovered.status_code == 200, recovered.text
    assert recovered.json()["messages"][0]["role"] == "assistant"


async def test_ownership_session_and_origin_are_enforced(client, test_engine):
    a = await start(client)
    assert (
        await client.post(
            "/api/attempts",
            json={"task_id": "dns"},
            headers={"Origin": "https://evil.example"},
        )
    ).status_code == 403
    async with AsyncSession(test_engine) as db:
        other = User(github_id=uuid4().int % 10**12, handle="other", name="다른 학습자")
        db.add(other)
        await db.flush()
        foreign = Attempt(
            user_id=other.id, task_id="http", task_snapshot={"title": "private"}
        )
        db.add(foreign)
        await db.commit()
        foreign_id = foreign.id if not db.sync_session.expire_on_commit else None
        if foreign_id is None:
            await db.refresh(foreign)
            foreign_id = foreign.id
    assert (await client.get(f"/api/attempts/{foreign_id}")).status_code == 404
    assert (await client.post(f"/api/attempts/{foreign_id}/retry")).status_code == 404
    assert (await client.get(f"/api/attempts/{a['id']}")).status_code == 200
    await client.post("/api/auth/logout")
    assert (await client.get("/api/me")).status_code == 401


async def test_database_rejects_two_active_attempts(account, test_engine):
    async with AsyncSession(test_engine) as db:
        db.add(Attempt(user_id=account[0].id, task_id="http", task_snapshot={}))
        db.add(Attempt(user_id=account[0].id, task_id="dns", task_snapshot={}))
        with pytest.raises(IntegrityError):
            await db.commit()


async def test_simultaneous_starts_keep_single_active_attempt(client):
    first, second = await asyncio.gather(
        client.post("/api/attempts", json={"task_id": "http"}),
        client.post("/api/attempts", json={"task_id": "dns"}),
    )
    assert sorted([first.status_code, second.status_code]) == [200, 409]


async def test_in_flight_answer_blocks_second_request(client, monkeypatch):
    fake_providers(monkeypatch)
    a = await start(client)
    await client.post(
        f"/api/attempts/{a['id']}/submission",
        json={"repo": "https://github.com/owner/repository"},
    )
    entered, release = asyncio.Event(), asyncio.Event()
    original = providers.assess

    async def delayed(*args):
        entered.set()
        await release.wait()
        return await original(*args)

    monkeypatch.setattr(providers, "assess", delayed)
    first = asyncio.create_task(
        client.post(
            f"/api/attempts/{a['id']}/messages",
            json=await answer_payload(client, a, "첫 답변", "one"),
        )
    )
    await asyncio.wait_for(entered.wait(), 5)
    second = await client.post(
        f"/api/attempts/{a['id']}/messages",
        json=await answer_payload(client, a, "다른 답변", "two"),
    )
    release.set()
    assert second.status_code == 409
    assert (await first).status_code == 200
    assert len((await client.get(f"/api/attempts/{a['id']}")).json()["messages"]) == 3


async def test_tenth_answer_finishes_and_eleventh_is_rejected(
    client, monkeypatch, test_engine
):
    fake_providers(monkeypatch)
    a = await start(client)
    await client.post(
        f"/api/attempts/{a['id']}/submission",
        json={"repo": "https://github.com/owner/repository"},
    )
    async with AsyncSession(test_engine) as db:
        for i in range(9):
            db.add(
                Message(
                    attempt_id=a["id"],
                    sequence=i * 2 + 1,
                    role="user",
                    content="이전 답변",
                    request_key=f"previous-{i}",
                )
            )
            db.add(
                Message(
                    attempt_id=a["id"],
                    sequence=i * 2 + 2,
                    role="assistant",
                    content="추가 질문",
                )
            )
        await db.commit()
    original = providers.assess

    async def verify_turns(task, files, messages, turns):
        assert turns == 10
        return await original(task, files, messages, turns)

    monkeypatch.setattr(providers, "assess", verify_turns)
    tenth = await client.post(
        f"/api/attempts/{a['id']}/messages",
        json=await answer_payload(client, a, "마지막 답변", "tenth"),
    )
    assert tenth.status_code == 200
    assert tenth.json()["status"] == "completed"
    eleventh = await client.post(
        f"/api/attempts/{a['id']}/messages",
        json=await answer_payload(client, a, "더 보낸 답변", "eleventh"),
    )
    assert eleventh.status_code == 409


async def test_provider_operation_rate_limit_does_not_drop_answer(client, monkeypatch):
    fake_providers(monkeypatch)
    a = await start(client)
    await client.post(
        f"/api/attempts/{a['id']}/submission",
        json={"repo": "https://github.com/owner/repository"},
    )
    monkeypatch.setattr(get_settings(), "ai_requests_per_minute", 1)
    limited = await client.post(
        f"/api/attempts/{a['id']}/messages",
        json=await answer_payload(client, a, "대기 중 답변", "limited"),
    )
    assert limited.status_code == 429
    assert len((await client.get(f"/api/attempts/{a['id']}")).json()["messages"]) == 1


async def test_oauth_success_creates_hashed_thirty_day_session(
    client, monkeypatch, test_engine
):
    from urllib.parse import parse_qs, urlsplit

    from sqlmodel import select

    from app.models import LoginSession

    settings = get_settings()
    monkeypatch.setattr(settings, "github_client_id", "test-client")
    monkeypatch.setattr(
        settings,
        "github_client_secret",
        type(settings.github_client_secret)("test-secret"),
    )
    started = await client.get("/api/auth/github")
    state = parse_qs(urlsplit(started.headers["location"]).query)["state"][0]
    original = httpx.AsyncClient
    github_id = uuid4().int % 10**12

    def respond(request):
        if request.url.host == "github.com":
            return httpx.Response(
                200, json={"access_token": "never-persisted-oauth-token"}
            )
        return httpx.Response(
            200, json={"id": github_id, "login": "oauth-learner", "name": "OAuth 검증"}
        )

    monkeypatch.setattr(
        auth.httpx,
        "AsyncClient",
        lambda **kwargs: original(transport=httpx.MockTransport(respond), **kwargs),
    )
    completed = await client.get(
        "/api/auth/github/callback", params={"state": state, "code": "valid-code"}
    )
    assert completed.headers["location"] == get_settings().app_origin + "/home"
    raw = completed.cookies[auth.COOKIE]
    async with AsyncSession(test_engine) as db:
        session = await db.get(LoginSession, auth.digest(raw))
        assert session is not None
        assert (
            now() + timedelta(days=29) < session.expires_at < now() + timedelta(days=31)
        )
        assert session.token_hash != raw
        user = (await db.exec(select(User).where(User.github_id == github_id))).one()
        assert user.name == "OAuth 검증"


@pytest.mark.parametrize(
    "url",
    [
        "http://github.com/a/b",
        "https://evil.example/a/b",
        "https://github.com/a/b?x=1",
        "https://github.com/a/b/tree/main",
        "https://github.com/a/.git",
        "https://[bad/a/b",
    ],
)
def test_repository_url_rejects_noncanonical_targets(url):
    with pytest.raises(HTTPException):
        providers.repository_url(url)


def test_collector_accepts_root_source_without_mandatory_markdown():
    assert providers.included("server.py", ["**/*.py"])
    assert providers.included("src/server.py", ["**/*.py"])
    assert not providers.included("node_modules/server.py", ["**/*.py"])
    assert not providers.included(".env", ["**/*"])
    assert not providers.included("cookies.txt", ["**/*.txt"])
    for extension in ("ts", "cs", "c", "cpp", "kt", "rb", "zig", "exs"):
        assert providers.included(f"experiment.{extension}", ["**/*"])
    for path in ("key.pem", "site.min.js", "asset.png", "dist/main.ts", "id_rsa"):
        assert not providers.included(path, ["**/*"])
    for path in (
        ".npmrc",
        ".netrc",
        ".aws/credentials",
        ".ssh/config",
        "credentials.json",
    ):
        assert not providers.included(path, ["**/*"])


@pytest.mark.parametrize("case", ["binary-not-counted", "text-limit", "download-limit"])
async def test_repository_budgets_apply_after_text_classification(monkeypatch, case):
    settings = get_settings()
    monkeypatch.setattr(settings, "github_client_id", "test-app")
    monkeypatch.setattr(
        settings,
        "github_client_secret",
        type(settings.github_client_secret)("test-secret"),
    )
    if case == "download-limit":
        monkeypatch.setattr(settings, "github_download_max_bytes", 1000)
    text = b"print('source')" if case != "text-limit" else b"x" * 200001
    binary = b"\0" * 210000
    original = httpx.AsyncClient

    def respond(request):
        assert request.url.host == "api.github.com"
        assert (
            request.headers["authorization"]
            == "Basic " + base64.b64encode(b"test-app:test-secret").decode()
        )
        path = request.url.path
        if "/branches/" in path:
            return httpx.Response(
                200, json={"commit": {"commit": {"tree": {"sha": "tree"}}}}
            )
        if "/git/trees/" in path:
            return httpx.Response(
                200,
                json={
                    "tree": [
                        {
                            "path": "experiment.ts",
                            "type": "blob",
                            "mode": "100644",
                            "size": len(text),
                            "sha": "source",
                        },
                        {
                            "path": "unknown.data",
                            "type": "blob",
                            "mode": "100644",
                            "size": len(binary),
                            "sha": "binary",
                        },
                    ]
                },
            )
        if "/git/blobs/" in path:
            raw = text if path.endswith("source") else binary
            return httpx.Response(200, json={"content": base64.b64encode(raw).decode()})
        return httpx.Response(200, json={"private": False})

    monkeypatch.setattr(
        providers.httpx,
        "AsyncClient",
        lambda **kwargs: original(transport=httpx.MockTransport(respond), **kwargs),
    )
    task = {"branch": "smallbyte/http-messages", "file_patterns": ["**/*"]}
    if case == "binary-not-counted":
        files = await providers.read_repository(
            "https://github.com/owner/repository", task
        )
        assert files == [{"path": "experiment.ts", "content": text.decode()}]
    else:
        with pytest.raises(HTTPException) as error:
            await providers.read_repository("https://github.com/owner/repository", task)
        assert error.value.status_code == 422
        assert (
            "다운로드" if case == "download-limit" else "텍스트"
        ) in error.value.detail


async def test_stale_device_answer_is_rejected_without_consuming_a_turn(
    client, monkeypatch
):
    fake_providers(monkeypatch)
    a = await start(client)
    submitted = await client.post(
        f"/api/attempts/{a['id']}/submission",
        json={"repo": "https://github.com/owner/repository"},
    )
    question_id = submitted.json()["messages"][-1]["id"]

    async def next_question(*args):
        return AssessmentReply(action="question", message="새로운 질문", checked=[])

    monkeypatch.setattr(providers, "assess", next_question)
    first = await client.post(
        f"/api/attempts/{a['id']}/messages",
        json={
            "content": "기기 A 답변",
            "request_key": "device-a",
            "question_id": question_id,
        },
    )
    assert first.status_code == 200
    stale = await client.post(
        f"/api/attempts/{a['id']}/messages",
        json={
            "content": "이전 질문에 대한 기기 B 답변",
            "request_key": "device-b",
            "question_id": question_id,
        },
    )
    assert stale.status_code == 409
    saved = (await client.get(f"/api/attempts/{a['id']}")).json()
    assert len(saved["messages"]) == 3
    assert saved["messages"][-1]["content"] == "새로운 질문"


async def test_ai_invalid_response_is_retried_but_never_saved_as_a_grade(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(
        settings, "ollama_api_key", type(settings.ollama_api_key)("test-key")
    )
    calls = []
    original = httpx.AsyncClient

    def respond(request):
        calls.append(json.loads(request.content))
        return httpx.Response(
            200,
            json={
                "message": {
                    "content": json.dumps(
                        {
                            "action": "pass",
                            "message": "ok",
                            "checked": [],
                            "criteria": [],
                        }
                    )
                }
            },
        )

    monkeypatch.setattr(
        providers.httpx,
        "AsyncClient",
        lambda **kwargs: original(transport=httpx.MockTransport(respond), **kwargs),
    )
    with pytest.raises(HTTPException) as exc:
        await providers.assess({"rubric": [{"id": "criterion"}]}, [], [], 10)
    assert exc.value.status_code == 502
    assert len(calls) == 2
    assert calls[0]["stream"] is False


async def test_oauth_state_is_browser_bound_and_one_time(client, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "github_client_id", "test-client")
    monkeypatch.setattr(
        settings,
        "github_client_secret",
        type(settings.github_client_secret)("test-secret"),
    )
    started = await client.get("/api/auth/github")
    from urllib.parse import parse_qs, urlsplit

    state = parse_qs(urlsplit(started.headers["location"]).query)["state"][0]
    assert auth.STATE_COOKIE in started.cookies
    # A cancelled callback still consumes valid state and never creates a session.
    cancelled = await client.get(
        "/api/auth/github/callback", params={"state": state, "error": "access_denied"}
    )
    assert cancelled.headers["location"] == settings.app_origin + "/?auth=failed"
    replayed = await client.get(
        "/api/auth/github/callback", params={"state": state, "code": "replayed"}
    )
    assert replayed.headers["location"] == settings.app_origin + "/?auth=failed"
