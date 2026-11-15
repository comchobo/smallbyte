# Verification record

## Environment

- Date: 2026-11-15
- Docker Compose project: `wet-fish`, `compose.dev.yaml`
- Browser origin: `http://localhost:3307`
- AI: real Ollama Cloud native `/api/chat`, `deepseek-v4.1-flash:1017`
- Public submission repository: https://github.com/comchobo/smallbyte-test
- Credentials remained in the ignored environment; no tokens or private cookies are included here.
- Public GitHub reads now use the approved OAuth App's server-side HTTP Basic credentials exclusively with `api.github.com`. The anonymous shared-IP limit was encountered during repeated verification; an actual app-authenticated streamed read then succeeded. Public-only access and non-persistence of user OAuth tokens remain enforced.

## Real providers

- GitHub OAuth: the user completed the real browser login; the API persisted the GitHub account and an unexpired application session. An API test separately verifies the callback protocol, one-time state, hashed token storage, and 30-day expiry.
- Created the four approved assignment branches in the test repository with standard-library experiment source. Each experiment was executed inside Compose: DNS/TCP/TLS success and controlled failures, HTTP GET/HEAD/404/501, cache 200/304/changed validator, and cookie deletion versus server invalidation all passed their assertions.
- `tests/test_live.py` uses a disposable PostgreSQL database and real GitHub/Ollama clients, with no provider response mocking. It verifies fetched source, grounded questions, final criteria, persisted result, and history.

| Live case | Learner answers to completion | Result |
| --- | ---: | --- |
| DNS·connection | 3 | PASS |
| HTTP messages | 4 | PASS |
| HTTP cache | 1 | PASS |
| Cookie·session | 3 | PASS |
| HTTP messages, deliberately insufficient answers | 2 | FAIL |

The first live batch exposed a mismatch between formatted local verification files and the test repository. The test repository was synchronized and the affected four cases passed on rerun. DNS had already passed and was not repeated. These are synthetic integration scenarios; the positive learner answers are generated from the verification source and the negative answers explicitly lack understanding.

After adding question-ID conflict protection, the real HTTP PASS case was rerun and completed in two learner answers. The final streaming collector was also checked with a real app-authenticated GitHub read (task version 2). Text-budget, credential-file, and download-budget rejection cases are covered independently with controlled provider responses.

## Browser verification

Chromium ran inside the development web container. A separate temporary verification account was used for automated interaction; the real OAuth account was not modified by the automation.

- Landing and learning home checked at 1440px and 390px.
- Onboarding saved to the API and produced the expected recommendation order.
- Task preview, start, invalid public repository recovery, and actual test-repository submission exercised.
- Chat resumed after full-page reload. A reload race discovered during this check was fixed by waiting for dashboard initialization before route guarding.
- Unsent answer cleared after reload, while server-saved messages and submitted files remained available.
- Actual AI conversation reached final FAIL and appeared in history with criteria and source.
- Profile name and default repository saved through the UI.
- Mobile chat, result, history and settings checked; no horizontal document overflow in tested layouts.
- Browser console contained no errors after the completed authenticated flow.
- The question-ID answer contract was exercised through the browser against the real API after its introduction.
- Original prototype lettering was extracted into a self-hosted WOFF2 asset. Final captures verified dark source panels, document surfaces, current-control markers, compact history activity and mobile evidence-first ordering.

Screenshots are local verification artifacts under the ignored `web/.playwright-cli/` directory; they are not product assets.
The temporary browser verification account and its sessions/attempts were removed after capture; the real OAuth account remains available.

## Automated checks

- Default API suite: **25 passed, 5 skipped** (the five billable live cases are opt-in).
- API: Ruff lint, Ruff formatting, import-linter layer contract and `ty` passed.
- FE: Biome, Next route type generation, TypeScript, dependency-cruiser and optimized production build passed.
- Default tests isolate provider failure branches with controlled responses; the real-provider checks above are separate.
- Final independent full code review: **complete; no P0, P1, or P2 findings**. Earlier findings were fixed and regression-tested before the fresh review.
- Independent UI verdict: **ship** for all seven listed restoration/accessibility fixes; all authoritative desktop/mobile captures were reopened and the fixes scored resolved.
- Local Git hooks reported that the `lefthook` executable was unavailable. Equivalent configured API/FE checks, production build and development/production Compose validation were executed directly through Compose; no hook configuration was changed or bypass flag used.
