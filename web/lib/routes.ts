const paths = {
  landing: "/",
  login: "/login",
  onboarding: "/onboarding",
  home: "/home",
  task: "/task",
  assessment: "/assessment",
  history: "/history",
  mypage: "/mypage",
} as const;

export type Page = keyof typeof paths | "preview" | "result";
export type LearningRoute = { page: Page; task?: string; record?: string };

export function pageHref(page: Page, task = "", record = ""): string {
  if (page === "preview") return `/tasks/${encodeURIComponent(task)}`;
  if (page === "result") return `/results/${encodeURIComponent(record)}`;
  return paths[page];
}
