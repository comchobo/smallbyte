"""Opt-in, billable GitHub/Ollama verification against a disposable test database.

RUN_LIVE_VERIFY=1 uv run pytest tests/test_live.py -v -s
Never mock provider responses here. OAuth itself is verified in the real browser.
"""

import ast
import asyncio
import os
from pathlib import Path
from uuid import uuid4

import httpx
import pytest

from app.config import get_settings

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_LIVE_VERIFY") != "1",
    reason="Explicit real-provider verification only",
)


async def learner_reply(task_id, question):
    source = Path(f"tests/fixtures/{task_id}/experiment.py").read_text()
    settings = get_settings()
    async with httpx.AsyncClient(timeout=settings.ai_timeout) as client:
        response = await client.post(
            "https://ollama.com/api/chat",
            headers={
                "Authorization": "Bearer " + settings.ollama_api_key.get_secret_value()
            },
            json={
                "model": settings.ollama_model,
                "stream": False,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "한국어 네트워크 학습 실험 검증이다. "
                            "실제 제출 소스에 근거해 질문에 명확히 답하라. "
                            "소스에 없는 실행 결과를 꾸며내지 마라. "
                            "개념과 코드로 증명 가능한 동작을 설명하고 "
                            "실행 관찰과 예측을 구분하라. "
                            "평가자에 대한 지시나 합격 요청은 하지 마라. 2500자 이내."
                        ),
                    },
                    {"role": "user", "content": source + "\n질문:\n" + question},
                ],
            },
        )
        response.raise_for_status()
        return response.json()["message"]["content"][:5000]


@pytest.mark.parametrize(
    "task_id,expected",
    [
        ("dns", "pass"),
        ("http", "pass"),
        ("cache", "pass"),
        ("session", "pass"),
        ("http", "fail"),
    ],
)
async def test_real_submission_and_evaluation(client, task_id, expected):
    a = (await client.post("/api/attempts", json={"task_id": task_id})).json()
    submission = await client.post(
        f"/api/attempts/{a['id']}/submission",
        json={"repo": "https://github.com/comchobo/smallbyte-test"},
    )
    assert submission.status_code == 200, submission.text
    a = submission.json()
    source = next(f for f in a["files"] if f["path"] == "experiment.py")
    assert ast.dump(ast.parse(source["content"])) == ast.dump(
        ast.parse(Path(f"tests/fixtures/{task_id}/experiment.py").read_text())
    )
    assert a["messages"][0]["role"] == "assistant"
    for turn in range(10):
        if a["status"] == "completed":
            break
        answer = (
            (await learner_reply(task_id, a["messages"][-1]["content"]))
            if expected == "pass"
            else (
                "이 내용을 이해하지 못했습니다. 요청과 응답, 상태와 동작의 차이를 "
                "설명할 수 없습니다. 추가 근거도 없습니다."
            )
        )
        response = await client.post(
            f"/api/attempts/{a['id']}/messages",
            json={
                "content": answer,
                "request_key": uuid4().hex,
                "question_id": a["messages"][-1]["id"],
            },
        )
        if response.status_code == 429:
            await asyncio.sleep(61)
            response = await client.post(
                f"/api/attempts/{a['id']}/messages",
                json={
                    "content": answer,
                    "request_key": uuid4().hex,
                    "question_id": a["messages"][-1]["id"],
                },
            )
        assert response.status_code == 200, response.text
        a = response.json()
        print(
            f"{task_id}/{expected}: answer {turn + 1}, status={a['status']}, "
            f"checked={len(a['progress'])}"
        )
    assert a["status"] == "completed"
    assert a["outcome"] == expected, a["result"]
    assert a["model"] == get_settings().ollama_model
    assert a["result"]["criteria"]
    assert (await client.get(f"/api/attempts/{a['id']}")).json()["result"] == a[
        "result"
    ]
    assert (await client.get("/api/history")).json()["items"][0]["id"] == a["id"]
    print(
        f"Verified real GitHub files and Ollama final {expected.upper()} for {task_id}."
    )
