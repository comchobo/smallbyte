export type Preferences = { purpose: string; goal: string; experience: string };
export type User = Preferences & {
  id: string;
  handle: string;
  name: string;
  default_repo: string;
  onboarding_complete: boolean;
};
export type Task = {
  id: string;
  version: number;
  title: string;
  concept: string;
  area: string;
  minutes: number;
  description: string;
  problem: string;
  requirements: string[];
  steps: string[];
  hints: string[];
  starter: string;
  submission_guidance: string;
  branch: string;
  rubric: { id: string; title: string; description: string }[];
  file_patterns: string[];
};
export type Attempt = {
  id: string;
  task_id: string;
  status: string;
  repo: string;
  task_snapshot: Task;
  files: { path: string; content: string }[];
  progress: string[];
  outcome: "pass" | "fail" | null;
  model: string;
  completed_at: string | null;
  messages: {
    id: string;
    role: string;
    content: string;
    request_key: string | null;
  }[];
  operation: { id: string; status: string; error: string } | null;
  result: {
    message: string;
    strengths: string;
    improvements: string;
    criteria: { id: string; met: boolean; evidence: string }[];
  } | null;
};
export type Dashboard = {
  order: string[];
  passed: string[];
  active: Attempt | null;
  recommended: string | null;
  reason: string;
};
export type History = {
  page: number;
  total: number;
  items: {
    id: string;
    task_id: string;
    title: string;
    concept: string;
    outcome: string;
    completed_at: string;
  }[];
};
export type Activity = {
  start: string;
  today: string;
  days: { date: string; count: number }[];
};
export type Leaderboard = {
  start: string;
  today: string;
  items: {
    id: string;
    name: string;
    handle: string;
    count: number;
    rank: number;
  }[];
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: data === undefined ? {} : { "Content-Type": "application/json" },
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: AbortSignal.timeout(300000),
    });
  } catch {
    throw new ApiError(
      0,
      "서버 응답을 받지 못했습니다. 연결 상태를 확인한 뒤 다시 불러와 주세요.",
    );
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      typeof body.detail === "string"
        ? body.detail
        : "입력 내용을 확인하고 다시 시도해 주세요.",
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const preferenceKeys = ["purpose", "goal", "experience"] as const;
export const preferenceLabels: Record<keyof Preferences, string> = {
  purpose: "학습 목적",
  goal: "관심 분야",
  experience: "현재 경험",
};
export const onboardingQuestions = [
  "무엇을 위해 배우고 있나요?",
  "어떤 분야가 궁금한가요?",
  "어느 정도 경험이 있나요?",
] as const;
export const choices = {
  purpose: [
    [
      "explore",
      "관심 분야를 탐색하고 싶어요",
      "무엇을 배울지 아직 정하지 않았어요.",
    ],
    [
      "basics",
      "기초를 제대로 이해하고 싶어요",
      "CS 개념과 동작 원리를 연결하고 싶어요.",
    ],
    [
      "career",
      "취업·직무 전환을 준비해요",
      "목표 직무에 필요한 지식을 쌓고 싶어요.",
    ],
    [
      "work",
      "실무에서 부족한 부분을 채워요",
      "프로젝트에서 만난 문제를 이해하고 싶어요.",
    ],
    [
      "school",
      "학교에서 배운 내용을 적용해요",
      "이론을 작은 실험으로 확인하고 싶어요.",
    ],
  ],
  goal: [
    ["undecided", "아직 탐색 중이에요", "여러 개념을 접하고 싶어요."],
    ["cs", "컴퓨터 과학 기초", "네트워크와 웹의 동작 원리"],
    ["backend", "백엔드 개발", "서버와 데이터 처리"],
    ["frontend", "프론트엔드 개발", "브라우저와 웹"],
    ["reliability", "서비스 운영·안정성", "네트워크와 오류 처리"],
  ],
  experience: [
    ["beginner", "이제 시작해요", "코드를 많이 작성해 보지 않았어요."],
    [
      "basic",
      "기초 코드는 읽고 쓸 수 있어요",
      "함수, 조건문, 반복문을 사용해 봤어요.",
    ],
    [
      "experienced",
      "프로젝트를 만들어 봤어요",
      "동작을 넘어 원리를 이해하고 싶어요.",
    ],
  ],
};
export const preferenceLabel = (key: keyof Preferences, value: string) =>
  choices[key].find((c) => c[0] === value)?.[1] || "아직 선택하지 않음";
export const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
