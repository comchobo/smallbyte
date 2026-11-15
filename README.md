# smallbyte

작은 실험과 작업물 기반 대화로 웹 CS를 학습하는 앱입니다. `PROTOTYPE.html`을 바탕으로 Next.js, FastAPI, PostgreSQL에 실제 기능을 구현했습니다.

## 개발 환경

개발·테스트·디버깅은 모두 `compose.dev.yaml` 환경에서 실행합니다. Docker와 Docker Compose가 필요합니다.

1. `.env.example`을 참고해 gitignore된 `.env`를 준비합니다. `POSTGRES_PASSWORD`는 빈 값일 수 없습니다.
2. GitHub OAuth App을 등록합니다. 기본 홈페이지는 `http://localhost:3307`, 콜백은 `http://localhost:3307/api/auth/github/callback`입니다.
3. `.env`에 `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `OLLAMA_API_KEY`를 설정합니다. 비밀값은 저장소에 커밋하지 않습니다.
4. 다음 명령으로 실행합니다.

```sh
docker compose -p wet-fish -f compose.dev.yaml up -d --build --wait
```

`http://localhost:3307`에서 앱을 엽니다. 다른 worktree에서는 `-p`에 해당 디렉터리 이름을 사용합니다. 포트가 사용 중이면 `WEB_PORT`와 `APP_ORIGIN`, OAuth App의 홈페이지·콜백 포트를 함께 변경합니다. `APP_ORIGIN`은 끝에 `/`가 없는 브라우저 출처여야 합니다.

API는 내부 네트워크에서만 노출됩니다. 브라우저의 `/api/*` 요청은 Next.js가 FastAPI로 전달합니다. API 문서는 `/api/docs`입니다.

### 주요 설정

| 변수 | 기본값 / 용도 |
| --- | --- |
| `WEB_PORT` | `3307` |
| `APP_ORIGIN` | `http://localhost:3307`; 요청 출처·OAuth 콜백·쿠키 설정 |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub OAuth App 자격 증명 |
| `OLLAMA_API_KEY` | Ollama Cloud 키, 서버에서만 사용 |
| `OLLAMA_MODEL` | `deepseek-v4.1-flash:1017` |
| `GITHUB_TIMEOUT` | 15초; 제출 파일 수집 전체에도 적용 |
| `AI_TIMEOUT` | AI HTTP 호출당 120초 |
| `SUBMISSION_MAX_BYTES` | 200,000바이트 |
| `GITHUB_DOWNLOAD_MAX_BYTES` | 파일 판별용 GitHub 응답 다운로드 총량 2,000,000바이트; 바이너리는 텍스트 한도에 합산하지 않음 |
| `AI_REQUESTS_PER_MINUTE` | 사용자별 평가 작업 최대 6회, 동시에 1개 |

AI 응답 형식 오류에는 자동 재호출을 1회 수행합니다. 네트워크 오류는 저장된 답변으로 사용자가 재시도합니다. 비스트리밍 요청을 위해 Next.js 프록시 대기 시간은 300초입니다.

GitHub OAuth는 공개 프로필 로그인에 사용하며 받은 사용자 OAuth 토큰은 DB에 저장하지 않습니다. 공개 저장소 조회는 서버의 OAuth App Client ID·Secret을 HTTP Basic 인증으로 `https://api.github.com`에만 전달합니다. 앱 자격 증명이 있으면 GitHub의 앱별 공개 데이터 조회 한도(일반적으로 시간당 5,000회)를 사용하고, 미설정 시 인증 없는 공유 IP 한도(시간당 60회)가 적용됩니다. 비공개 저장소는 받지 않으며 외부 리디렉션을 따라가지 않습니다. 앱 세션은 무작위 토큰의 해시만 DB에 저장하며 30일 유효합니다. HTTPS `APP_ORIGIN`에서는 Secure 쿠키를 사용합니다.

## 학습 흐름

- 온보딩으로 목적·관심 분야·경험을 설정하고 추천 코스를 확인합니다.
- 진행 과제는 사용자당 1개입니다. 순서는 자유롭게 선택하며 기한은 없습니다.
- 공개 저장소 URL을 제출하면 과제의 지정 브랜치에서 평가 대상 텍스트 파일을 한 번 읽습니다.
- 당시 파일·과제·평가 기준을 보관하며 대화 중 브랜치 변경은 반영하지 않습니다. 다시 도전하면 새로 읽습니다.
- 제출물과 답변에 근거해 AI가 질문과 종료를 결정합니다. 항목 확인 진행도는 합격 확률이나 남은 질문 수가 아닙니다.
- 최대 10회, 답변당 5,000자입니다. 마지막에만 P/F와 기준별 근거·강점·보완점을 확정합니다. API 오류는 FAIL이 아닙니다.
- 완료 후 대화·당시 제출물·결과를 이력에서 확인합니다. 한 번 PASS한 과제의 완료 상태는 유지됩니다.
- 전송한 답변은 DB에 저장되지만 미전송 초안은 저장하지 않습니다.

### 과제와 브랜치

| 과제 | 지정 브랜치 |
| --- | --- |
| DNS·연결 수립 | `smallbyte/dns-connection` |
| HTTP 메시지 | `smallbyte/http-messages` |
| HTTP 캐시 | `smallbyte/http-cache` |
| 쿠키·세션 | `smallbyte/cookie-session` |

`api/app/content/*.json`에 과제별 문제·실험·힌트·파일 규칙·루브릭이 있습니다. Markdown이나 특정 언어는 공통 필수가 아닙니다. 코드·설정이 입증하는 동작도 평가하며 관찰했다고 주장하는 결과는 근거를 확인합니다. 서버는 학습자 코드를 실행하지 않습니다. 바이너리·의존성·빌드 결과물·환경 비밀파일·쿠키 저장 파일은 수집하지 않습니다.

## BE 구조

기존 의존성 방향을 유지합니다.

```text
routers → services → repositories → models/schemas → db/config
```

주요 테이블: `users`, `sessions`, `oauth_states`, `tasks`, `attempts`, `messages`, `operations`, `activity_events`.

외부 작업은 짧은 DB 트랜잭션 사이에서 실행합니다. 사용자 잠금·고유 제약·답변 요청 키로 동시 과제와 중복 메시지를 막습니다. 작업이 중단되면 유효기한 후 재시도하며 늦게 도착한 이전 응답을 중복 반영하지 않습니다. 외부 제공자 호출 자체는 재시도 시 다시 발생할 수 있습니다.

API 영역: `/api/auth/*`, `/api/me`, `/api/tasks`, `/api/dashboard`, `/api/attempts/*`, `/api/history`, `/api/activity`.

## 마이그레이션·운영

개발·운영 API 컨테이너는 `alembic upgrade head` 성공 후 서버를 시작합니다. 초기 마이그레이션은 테이블과 과제 4개를 등록합니다. 이미 배포한 과제 콘텐츠 변경은 버전을 올리고 별도 데이터 마이그레이션으로 적용합니다. 완료/진행 중 평가의 스냅샷은 변경하지 않습니다.

운영 `.env`에는 실제 HTTPS `APP_ORIGIN`과 `DOMAIN`, OAuth·Ollama 자격 증명이 필요합니다. 운영 API 이미지는 같은 마이그레이션과 과제 콘텐츠를 포함합니다.

```sh
docker compose -p smallbyte -f compose.prod.yaml up -d --build --wait
```

## 검증

```sh
docker compose -p wet-fish -f compose.dev.yaml exec api uv run --locked ruff check .
docker compose -p wet-fish -f compose.dev.yaml exec api uv run --locked ruff format --check .
docker compose -p wet-fish -f compose.dev.yaml exec api uv run --locked lint-imports
docker compose -p wet-fish -f compose.dev.yaml exec api uv run --locked ty check
docker compose -p wet-fish -f compose.dev.yaml exec api uv run --locked pytest
docker compose -p wet-fish -f compose.dev.yaml exec web pnpm check
docker compose -p wet-fish -f compose.dev.yaml run --rm --no-deps -e NEXT_DIST_DIR=.next web pnpm build
```

기본 테스트는 별도 PostgreSQL DB를 만들고 종료 시 삭제하며 외부 API를 호출하지 않습니다. 실제 API 검증은 명시적으로 실행해야 합니다. 과금이 발생할 수 있으며 `comchobo/smallbyte-test`의 지정 브랜치와 검증 소스가 필요합니다.

```sh
docker compose -p wet-fish -f compose.dev.yaml exec -e RUN_LIVE_VERIFY=1 api uv run pytest tests/test_live.py -v -s
```

`test_live.py`는 실제 GitHub 파일과 실제 Ollama 질문·판정·DB 저장을 검증합니다. PASS 검증의 학습자 답변도 AI로 생성하는 합성 시나리오이며, 실제 학습자 평가 품질의 통계적 검증은 아닙니다. OAuth는 실제 브라우저에서 별도로 검증합니다. 실행한 검증 기록은 `VERIFICATION.md`를 참고하세요.
