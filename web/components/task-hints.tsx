import type { Task } from "@/lib/learning";

const topics: Record<string, string[]> = {
  http: [
    "404가 나올 때",
    "송수신 기록",
    "HEAD 요청",
    "Content-Type",
    "바이트 길이",
    "HEAD의 응답 헤더",
    "POST 처리 범위",
    "관찰의 근거",
  ],
  cache: [
    "ETag 만들기",
    "따옴표 유지",
    "curl과 자동 캐시",
    "신선도 계산",
    "304의 본문",
    "저장 정책의 차이",
    "브라우저 새로고침",
  ],
  dns: [
    "단계 나누기",
    "이름 해석 경로",
    "IP와 서버 이름",
    "신뢰 설정 비교",
    "로컬 포트 유지",
    "오류 해석",
    "실험 대상 구분",
    "필요한 관찰 범위",
  ],
  session: [
    "HTTP의 무상태성",
    "헤더의 방향",
    "쿠키와 서버 세션",
    "쿠키 삭제 범위",
    "HttpOnly",
    "Secure",
    "SameSite",
    "curl의 확인 범위",
    "서버 실행 유지",
  ],
};

export function TaskHints({ task }: { task: Task }) {
  return (
    <dl className="hint-reference">
      {task.hints.map((hint, index) => (
        <div key={hint}>
          <dt>{topics[task.id]?.[index] || `참고 ${index + 1}`}</dt>
          <dd>{hint}</dd>
        </div>
      ))}
    </dl>
  );
}
