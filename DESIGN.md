# smallbyte visual system

시각적 기준은 저장소의 `PROTOTYPE.html`이다. 학습 지도는 지리 정보가 아닌 개념 간 이동을 나타내는 SVG이다.

## Tokens

- Paper `#fbfaf6`, card `#ffffff`, ink `#1b1d19`, secondary ink `#33372e`.
- Muted `#5f635a`, borders `#d9d7cc`, inset surface `#f2f0e8`.
- Course purple `#7b2f9e`, purple tint `#f1e6f6`.
- Completion olive `#4e5f38`, olive tint `#e9eddf`.
- Terrain: olive `#b5c48a`, yellow `#f5e27a`, blue `#7aa7d8`, contours `#a06a3c`.
- Failure red `#b4392c`, failure surface `#f8e3df`.

## Typography and controls

프로토타입의 내장 Display 폰트를 `web/public/fonts/display.woff2`로 로컬 제공한다. 한글 본문은 플랫폼 고딕 스택, 코드·파일·브랜치는 UI 모노스페이스를 사용한다. 제목은 28–46px, 본문 14px, 보조 설명 12–13px이다. 버튼과 입력은 최소 44px, 모서리는 2–3px, 포커스는 보라색 외곽선이다.

## Composition

- 전체 너비 최대 1280px, 데스크톱 좌우 여백 28px, 모바일 18px.
- 랜딩은 좌측 설명·GitHub 진입, 우측 예시 지도·실험으로 구성한다.
- 학습 홈은 지도·추천 과제를 주 영역에, 학습 방향·완료 수를 우측에 둔다.
- 대화는 대화 로그와 답변 입력이 주 영역이며 제출 자료를 옆에 둔다.
- 820px 이하에서 주요 화면은 단일 열로 전환한다. 코드는 자체 스크롤하고 본문 가로 넘침을 만들지 않는다.
- 지도 전체/현재 구간 이동만 짧게 전환하며 reduced-motion에서는 전환을 제거한다.

시연용 계정과 결과 도구를 제거하고, 실제 데이터·AI 평가임을 정확히 표현한다. 항목 확인 진행도를 합격률로 표현하지 않는다.
