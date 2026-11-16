"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ActivityPanel } from "@/components/activity-panel";
import { Avatar } from "@/components/avatar";
import { ConceptDiagram } from "@/components/concept-diagram";
import { CourseMap } from "@/components/course-map";
import { Icon } from "@/components/icon";
import { LandingSections } from "@/components/landing-sections";
import { Logo } from "@/components/logo";
import { TaskHints } from "@/components/task-hints";
import {
  ApiError,
  type Attempt,
  api,
  choices,
  type Dashboard,
  dateLabel,
  type History,
  type Preferences,
  preferenceLabel,
  type Task,
  type User,
} from "@/lib/learning";
import { type LearningRoute, type Page, pageHref } from "@/lib/routes";

const titles: Record<Page, string> = {
  landing: "시작하기",
  login: "로그인",
  onboarding: "학습 설정",
  home: "학습",
  preview: "과제 살펴보기",
  task: "과제",
  assessment: "이해도 확인",
  result: "피드백",
  history: "학습 기록",
  mypage: "마이페이지",
};

function GitHubIcon() {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path d="M9 20c-5 1-5-2-7-2m14 4v-4a3.5 3.5 0 0 0-1-3c3-.3 6-1.5 6-6a5 5 0 0 0-1-3.5A5 5 0 0 0 20 2s-1.5-.5-4 1a14 14 0 0 0-8 0C5.5 1.5 4 2 4 2a5 5 0 0 0 0 3.5A5 5 0 0 0 3 9c0 4.5 3 5.7 6 6a3.5 3.5 0 0 0-1 3v4" />
    </svg>
  );
}
function AccountMenu({
  user,
  busy,
  onLogout,
}: {
  user: User;
  busy: boolean;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLFieldSetElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !container.current?.contains(event.target)
      )
        setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        trigger.current?.focus();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);
  return (
    <fieldset
      className="account-menu"
      aria-label="계정"
      ref={container}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (
          event.pointerType === "mouse" &&
          !container.current?.contains(document.activeElement)
        )
          setOpen(false);
      }}
      onFocus={(event) => {
        if (event.target.matches(":focus-visible")) setOpen(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        className="avatar-link"
        type="button"
        ref={trigger}
        aria-label={`${user.name}님의 계정 메뉴`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar seed={user.id} />
      </button>
      <div className="account-popover" id={id} hidden={!open}>
        <div className="account-identity">
          <strong>{user.name}</strong>
          <span>@{user.handle}</span>
        </div>
        <nav aria-label="계정 메뉴">
          <Link href="/mypage" onClick={() => setOpen(false)}>
            마이페이지
          </Link>
          <button type="button" disabled={busy} onClick={onLogout}>
            {busy ? "처리 중…" : "로그아웃"}
          </button>
        </nav>
      </div>
    </fieldset>
  );
}
function Meta({ task }: { task: Task }) {
  return (
    <div className="meta">
      <span>{task.area}</span>
      <span>
        <Icon name="code" />
        형식·언어 자유
      </span>
      <span>
        <Icon name="clock" />
        예상 {task.minutes}분
      </span>
    </div>
  );
}
function Source({ attempt }: { attempt: Attempt }) {
  return (
    <details className="source" open>
      <summary>제출한 작업물</summary>
      <div className="source-inner">
        <p className="small muted">{attempt.repo}</p>
        <code>{attempt.task_snapshot.branch}</code>
        {attempt.files.map((file) => (
          <div className="code-panel" key={file.path}>
            <div className="code-file">{file.path}</div>
            <pre>
              <code>{file.content}</code>
            </pre>
          </div>
        ))}
        <p className="notice">
          평가 시작 시 가져온 파일입니다. 코드는 서버에서 실행하지 않습니다.
        </p>
      </div>
    </details>
  );
}
function Transcript({ attempt }: { attempt: Attempt }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (attempt.messages.length)
      end.current?.scrollIntoView({ block: "nearest" });
  }, [attempt.messages.length]);
  return (
    <div
      className="chat-log"
      role="log"
      aria-label="평가 대화"
      aria-live="polite"
    >
      {attempt.messages.map((m) => (
        <div key={m.id} className={`message ${m.role}`}>
          <div className="message-author">
            {m.role === "user" ? "나의 설명" : "학습 파트너 · AI"}
          </div>
          <div className="message-text">{m.content}</div>
        </div>
      ))}
      <div ref={end} />
    </div>
  );
}
function TaskStarter({ text }: { text: string }) {
  return text.split(/```[^\n]*\n([\s\S]*?)```/g).map((part, index) =>
    !part.trim() ? null : index % 2 ? (
      <div className="code-panel" key={part}>
        <pre>
          <code>{part.trimEnd()}</code>
        </pre>
      </div>
    ) : (
      <p className="starter-note" key={part}>
        {part.trim()}
      </p>
    ),
  );
}
function TaskDocument({ task }: { task: Task }) {
  const id = useId();
  return (
    <article className="task-document">
      <header className="task-intro">
        <h1>{task.title}</h1>
        <Meta task={task} />
        <p className="task-problem">{task.problem}</p>
      </header>
      <ConceptDiagram taskId={task.id} />
      <nav className="task-contents" aria-label="과제 목차">
        <a href={`#${id}-steps`}>실험 순서</a>
        <a href={`#${id}-criteria`}>완료 기준</a>
        <a href={`#${id}-submit`}>제출 방법</a>
        <a href={`#${id}-help`}>참고 자료</a>
      </nav>
      <section className="document-section" id={`${id}-steps`}>
        <h2>실험 순서</h2>
        <ol className="experiment-steps">
          {task.steps.map((step) => {
            const separator = task.version >= 3 ? step.indexOf(". ") : -1;
            return (
              <li key={step}>
                {separator < 0 ? (
                  step
                ) : (
                  <div>
                    <h3>{step.slice(0, separator)}</h3>
                    <p>{step.slice(separator + 2)}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>
      <section className="document-section" id={`${id}-criteria`}>
        <h2>완료 기준</h2>
        <p>아래 동작을 코드나 관찰 결과에 연결해 설명할 수 있으면 됩니다.</p>
        <ul className="completion-criteria">
          {task.requirements.map((requirement) => (
            <li key={requirement}>{requirement}</li>
          ))}
        </ul>
      </section>
      <section className="document-section" id={`${id}-submit`}>
        <h2>제출 방법</h2>
        <p>{task.submission_guidance}</p>
        <dl className="submission-facts">
          <div>
            <dt>공개 GitHub 저장소의 브랜치</dt>
            <dd>
              <code>{task.branch}</code>
            </dd>
          </div>
          <div>
            <dt>읽을 수 있는 파일</dt>
            <dd>텍스트 파일 합계 200KB 이내 · 언어·형식 자유</dd>
          </div>
          <div>
            <dt>평가 방식</dt>
            <dd>제출 파일을 읽고 최대 10회 대화 · 코드 실행 없음</dd>
          </div>
        </dl>
      </section>
      <section className="document-section task-resources" id={`${id}-help`}>
        <h2>참고 자료</h2>
        <details className="read-task">
          <summary>시작 코드와 명령 예시</summary>
          <TaskStarter text={task.starter} />
        </details>
        <details className="read-task">
          <summary>막혔을 때 확인할 힌트</summary>
          <TaskHints task={task} />
        </details>
        <details className="read-task">
          <summary>대화에서 확인할 개념</summary>
          <ul className="requirements">
            {task.rubric.map((item) => (
              <li key={item.id}>{item.title}</li>
            ))}
          </ul>
        </details>
      </section>
    </article>
  );
}

function validateRepository(value: string): string {
  const candidate = value
    .trim()
    .replace(/\/$/, "")
    .replace(/\.git$/, "");
  if (!candidate) return "GitHub 저장소 URL을 입력해 주세요.";
  const separator = candidate.indexOf("://");
  const match = candidate
    .slice(separator + 3)
    .match(/^github\.com\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_.-]+)$/);
  if (
    candidate.length > 300 ||
    candidate.slice(0, separator).toLowerCase() !== "https" ||
    !match ||
    [".", ".."].includes(match[2])
  ) {
    return "https://github.com/소유자/저장소 형식으로 입력해 주세요.";
  }
  return "";
}

export function LearningScreen({
  route,
  authFailed = false,
}: {
  route: LearningRoute;
  authFailed?: boolean;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [repo, setRepo] = useState("");
  const [repoError, setRepoError] = useState("");
  const [repoTouched, setRepoTouched] = useState(false);
  const repoInput = useRef<HTMLInputElement>(null);
  const [answer, setAnswer] = useState("");
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState<Preferences>({
    purpose: "",
    goal: "",
    experience: "",
  });
  const [records, setRecords] = useState<History | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const main = useRef<HTMLElement>(null);
  const loginDialog = useRef<HTMLDialogElement>(null);
  const requestKey = useRef<string | null>(null);
  const actionLock = useRef(false);
  const routeGeneration = useRef(0);

  const go = useCallback(
    (page: Page, task = "", record = "") => {
      router.push(pageHref(page, task, record));
    },
    [router],
  );
  const handleError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) {
        setUser(null);
        setDashboard(null);
        setAttempt(null);
        setAnswer("");
        setNotice(
          "로그인 유효기간이 만료되었습니다. GitHub로 다시 로그인해 주세요.",
        );
        router.replace(pageHref("landing"));
      } else
        setError(
          e instanceof Error
            ? e.message
            : "처리하지 못했습니다. 다시 시도해 주세요.",
        );
    },
    [router],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const catalog = await api<Task[]>("/tasks");
      setTasks(catalog);
      let account: User | null = null;
      try {
        account = await api<User>("/me");
      } catch (e) {
        if (!(e instanceof ApiError && e.status === 401)) throw e;
      }
      setUser(account);
      if (account) {
        setPreferences({
          purpose: account.purpose,
          goal: account.goal,
          experience: account.experience,
        });
        setDashboard(await api<Dashboard>("/dashboard"));
      } else setDashboard(null);
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  }, [handleError]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    main.current?.focus();
  }, []);
  const page = loading
    ? route.page
    : !user
      ? ["landing", "login"].includes(route.page)
        ? route.page
        : "landing"
      : route.page === "landing"
        ? "landing"
        : !user.onboarding_complete && route.page !== "mypage"
          ? "onboarding"
          : ["login", "onboarding"].includes(route.page)
            ? "home"
            : route.page;
  useEffect(() => {
    document.title = `${titles[page] || "학습"} · smallbyte`;
  }, [page]);
  useEffect(() => {
    if (!loading && page !== route.page) router.replace(pageHref(page));
  }, [loading, page, route.page, router]);
  useEffect(() => {
    const dialog = loginDialog.current;
    if (!dialog) return;
    if (!loading && page === "login" && !dialog.open) dialog.showModal();
    if ((loading || page !== "login") && dialog.open) dialog.close();
  }, [loading, page]);
  const closeLogin = useCallback(() => {
    loginDialog.current?.close();
    router.replace(pageHref("landing"));
  }, [router]);

  useEffect(() => {
    const generation = ++routeGeneration.current;
    setAttempt(null);
    setRepoError("");
    setRepoTouched(false);
    if (loading || !user || !["task", "assessment", "result"].includes(page))
      return;
    const id = page === "result" ? route.record : dashboard?.active?.id;
    if (!id) {
      if (page !== "result") router.replace("/home");
      else setError("기록을 찾을 수 없습니다.");
      return;
    }
    api<Attempt>(`/attempts/${id}`)
      .then((a) => {
        if (generation !== routeGeneration.current) return;
        setAttempt(a);
        setRepo(a.repo);
        if (a.status === "completed" && page !== "result")
          router.replace(pageHref("result", "", a.id));
      })
      .catch((e) => {
        if (generation === routeGeneration.current) handleError(e);
      });
    return () => {
      routeGeneration.current += 1;
    };
  }, [
    loading,
    page,
    route.record,
    user,
    dashboard?.active?.id,
    router,
    handleError,
  ]);

  useEffect(() => {
    if (attempt?.operation?.status !== "running") return;
    let stopped = false;
    const timer = window.setInterval(() => {
      api<Attempt>(`/attempts/${attempt.id}`)
        .then((a) => {
          if (stopped) return;
          setAttempt(a);
          if (a.status === "completed") {
            void api<Dashboard>("/dashboard")
              .then(setDashboard)
              .catch(handleError);
            router.replace(pageHref("result", "", a.id));
          }
        })
        .catch(handleError);
    }, 3000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [attempt, router, handleError]);

  useEffect(() => {
    if (page !== "history" || !user) return;
    let stopped = false;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        q: query,
        page: String(historyPage),
        ...(filter ? { outcome: filter } : {}),
      });
      api<History>(`/history?${params}`)
        .then((h) => {
          if (!stopped) {
            setRecords(h);
          }
        })
        .catch(handleError);
    }, 150);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [page, user, query, filter, historyPage, handleError]);

  async function action(work: () => Promise<void>) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      handleError(e);
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }
  async function begin(id: string) {
    await action(async () => {
      const a = await api<Attempt>("/attempts", "POST", { task_id: id });
      setDashboard(await api<Dashboard>("/dashboard"));
      setAttempt(a);
      setRepo(a.repo);
      go(a.status === "chatting" ? "assessment" : "task");
    });
  }
  async function assess(path: string, data?: unknown) {
    await action(async () => {
      try {
        const a = await api<Attempt>(path, "POST", data);
        setAttempt(a);
        if (
          a.messages.some(
            (m) => m.role === "user" && m.request_key === requestKey.current,
          )
        ) {
          setAnswer("");
          requestKey.current = null;
        }
        setDashboard(await api<Dashboard>("/dashboard"));
        go(
          a.status === "completed" ? "result" : "assessment",
          "",
          a.status === "completed" ? a.id : "",
        );
      } catch (e) {
        if (attempt) {
          try {
            const a = await api<Attempt>(`/attempts/${attempt.id}`);
            setAttempt(a);
            if (
              a.messages.some(
                (m) =>
                  m.request_key === requestKey.current && m.role === "user",
              )
            ) {
              setAnswer("");
              requestKey.current = null;
            }
          } catch {}
        }
        throw e;
      }
    });
  }
  async function saveProfile(data: unknown) {
    await action(async () => {
      const u = await api<User>("/me", "PATCH", data);
      setUser(u);
      setDashboard(await api<Dashboard>("/dashboard"));
      setNotice("변경 내용을 저장했습니다.");
    });
  }
  async function logout() {
    await action(async () => {
      await api("/auth/logout", "POST");
      setUser(null);
      setDashboard(null);
      setAttempt(null);
      setAnswer("");
      router.replace("/");
    });
  }
  const ordered = dashboard?.order || ["dns", "http", "cache", "session"];
  const selected = tasks.find((t) => t.id === route.task);
  const focus = dashboard ? dashboard.recommended : ordered[0];
  const featured = tasks.find((t) => t.id === (focus || ordered[0]));
  const nextTask = ordered
    .filter((id) => id !== focus && !dashboard?.passed.includes(id))
    .map((id) => tasks.find((task) => task.id === id))
    .find((task) => task !== undefined);
  const pending = attempt?.operation?.status === "running";
  const failed = attempt?.operation?.status === "failed";
  const ready = Boolean(user?.onboarding_complete);
  const entryHref = user ? (ready ? "/home" : "/onboarding") : "/login";
  const entryLabel = user
    ? ready
      ? "이어서 학습하기"
      : "학습 설정 이어하기"
    : "GitHub로 시작하기";
  const map = (mini = false, target = focus) => (
    <CourseMap
      tasks={tasks}
      order={ordered}
      passed={dashboard?.passed}
      focus={target}
      mini={mini}
      requiresLogin={!user}
    />
  );
  const resume = () =>
    go(dashboard?.active?.status === "chatting" ? "assessment" : "task");
  const errorUI = error && (
    <div className="recovery" role="alert">
      <strong>{error}</strong>
      <div className="actions">
        <button
          className="link-button"
          type="button"
          onClick={() => void refresh()}
        >
          다시 불러오기
        </button>
        <button
          className="link-button"
          type="button"
          onClick={() => go("home")}
        >
          학습 홈으로
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        className="skip"
        type="button"
        onClick={() => {
          main.current?.focus();
        }}
      >
        본문으로 이동
      </button>
      <header className="header">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label="smallbyte 홈">
            <Logo />
          </Link>
          {ready && (
            <nav className="nav" aria-label="주요 메뉴">
              <Link
                href="/home"
                aria-current={
                  ["home", "preview", "task", "assessment"].includes(page)
                    ? "page"
                    : undefined
                }
              >
                학습
              </Link>
              <Link
                href="/history"
                aria-current={
                  ["history", "result"].includes(page) ? "page" : undefined
                }
              >
                기록
              </Link>
            </nav>
          )}
          <div className="header-right">
            {user ? (
              <AccountMenu
                user={user}
                busy={busy}
                onLogout={() => void logout()}
              />
            ) : page !== "login" ? (
              <Link href="/login">로그인</Link>
            ) : null}
          </div>
        </div>
      </header>
      <main
        className="page"
        id="main"
        tabIndex={-1}
        ref={main}
        aria-busy={loading}
      >
        {authFailed && page !== "login" && (
          <p className="error" role="alert">
            GitHub 로그인을 완료하지 못했습니다. 다시 시도해 주세요.
          </p>
        )}
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        {tasks.length > 0 && errorUI}
        {loading ? (
          <div className="empty" role="status">
            <h1>학습 정보를 불러오는 중…</h1>
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty">
            <h1>학습 정보를 불러오지 못했습니다.</h1>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button
              className="primary"
              type="button"
              onClick={() => void refresh()}
            >
              다시 불러오기
            </button>
          </div>
        ) : (
          <>
            {(page === "landing" || page === "login") && (
              <>
                <div className="entry">
                  <section className="entry-copy">
                    <h1>
                      개념을 지형으로,
                      <br />
                      <em>배움을 코스로.</em>
                    </h1>
                    <p>
                      CS와 웹의 원리를 작은 실험으로 익힙니다. 나에게 맞는
                      코스를 따라가고, 작업물에 대한 대화로 이해를 확인하세요.
                    </p>
                    <Link className="primary" href={entryHref}>
                      {user ? <Icon name="arrow" /> : <GitHubIcon />}
                      {entryLabel}
                    </Link>
                  </section>
                  <section
                    className="entry-example"
                    aria-label="학습 코스 예시"
                  >
                    <div className="example-head">
                      <span>예시 코스 · 4개 과제</span>
                    </div>
                    <CourseMap
                      tasks={tasks}
                      order={["dns", "http", "cache", "session"]}
                      focus="cache"
                      mini
                      requiresLogin={!user}
                    />
                    <div className="example-body">
                      <h2>{tasks.find((t) => t.id === "cache")?.title}</h2>
                      <p>{tasks.find((t) => t.id === "cache")?.description}</p>
                      <div className="example-code">
                        <pre>
                          GET /message HTTP/1.1{"\n"}If-None-Match: "version-1"
                          {"\n\n"}HTTP/1.1 304 Not Modified
                        </pre>
                      </div>
                    </div>
                  </section>
                </div>
                <LandingSections
                  tasks={tasks}
                  startHref={entryHref}
                  startLabel={entryLabel}
                  signedIn={!!user}
                />
              </>
            )}
            {page === "onboarding" && (
              <div className="onboarding">
                <aside className="onboard-aside">
                  <h1>나에게 맞는 코스를 만듭니다.</h1>
                  <ol className="step-list">
                    {["학습 목적", "관심 분야", "현재 경험"].map((label, i) => (
                      <li
                        key={label}
                        className={
                          i === step ? "current" : i < step ? "done" : ""
                        }
                        aria-current={i === step ? "step" : undefined}
                      >
                        <span className="step-number">{i + 1}</span>
                        {label}
                      </li>
                    ))}
                  </ol>
                </aside>
                <form
                  className="onboard-panel"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (step < 2) setStep(step + 1);
                    else void saveProfile(preferences);
                  }}
                >
                  <h2>
                    {
                      [
                        "무엇을 위해 배우고 있나요?",
                        "어떤 분야가 궁금한가요?",
                        "어느 정도 경험이 있나요?",
                      ][step]
                    }
                  </h2>
                  <p>
                    가장 가까운 항목을 골라 주세요. 나중에 바꿀 수 있습니다.
                  </p>
                  <fieldset className="option-list">
                    <legend className="sr-only">
                      {["학습 목적", "관심 분야", "현재 경험"][step]}
                    </legend>
                    {choices[
                      (["purpose", "goal", "experience"] as const)[step]
                    ].map(([value, title, desc]) => {
                      const key = (["purpose", "goal", "experience"] as const)[
                        step
                      ];
                      return (
                        <label key={value} className="option">
                          <input
                            type="radio"
                            name={key}
                            value={value}
                            checked={preferences[key] === value}
                            onChange={() =>
                              setPreferences({ ...preferences, [key]: value })
                            }
                            required
                          />
                          <span>
                            <strong>{title}</strong>
                            <small>{desc}</small>
                          </span>
                        </label>
                      );
                    })}
                  </fieldset>
                  {step === 2 && (
                    <div className="onboard-summary">
                      {preferenceLabel("purpose", preferences.purpose)}
                      <br />
                      {preferenceLabel("goal", preferences.goal)}
                    </div>
                  )}
                  <div className="onboard-actions">
                    {step > 0 && (
                      <button
                        className="link-button"
                        type="button"
                        onClick={() => setStep(step - 1)}
                      >
                        이전
                      </button>
                    )}
                    <button className="primary" disabled={busy} type="submit">
                      {busy
                        ? "저장 중…"
                        : step === 2
                          ? "첫 코스 시작하기"
                          : "다음"}
                    </button>
                  </div>
                </form>
              </div>
            )}
            {page === "home" && dashboard && featured && (
              <>
                <header className="page-title">
                  <div>
                    <h1 className="home-title">나의 학습</h1>
                  </div>
                </header>
                {dashboard.passed.length === tasks.length &&
                  !dashboard.active && (
                    <section className="all-complete">
                      <h2>모든 과제를 완료했습니다.</h2>
                      <p>
                        기록에서 피드백을 다시 보거나 과제를 다시 수행할 수
                        있습니다.
                      </p>
                      <Link className="link-button" href="/history">
                        학습 기록 보기
                      </Link>
                    </section>
                  )}
                <div className="learning-grid">
                  <div>
                    {map()}
                    {(dashboard.active ||
                      dashboard.passed.length < tasks.length) && (
                      <article className="feature">
                        <div className="feature-body">
                          <div className="feature-head">
                            <h2>{featured.title}</h2>
                            <span className="tag">
                              {dashboard.active
                                ? "진행 중"
                                : "다음으로 배울 과제"}
                            </span>
                          </div>
                          <Meta task={featured} />
                          <p className="feature-description">
                            {featured.description}
                          </p>
                          <ConceptDiagram taskId={featured.id} compact />
                          <p className="feature-reason">{dashboard.reason}</p>
                        </div>
                        <div className="feature-bottom">
                          <button
                            className="primary"
                            type="button"
                            onClick={() =>
                              dashboard.active
                                ? resume()
                                : go("preview", featured.id)
                            }
                          >
                            {dashboard.active
                              ? "이어서 학습하기"
                              : "과제 살펴보기"}
                          </button>
                        </div>
                      </article>
                    )}
                  </div>
                  <aside className="profile-summary">
                    <h2 className="icon-heading">
                      <Icon name="activity" />
                      학습 현황
                    </h2>
                    <p className="summary-owner">{user?.name}님의 코스</p>
                    <div className="summary-progress">
                      <p>
                        <strong>{dashboard.passed.length}</strong> /{" "}
                        {tasks.length}개 과제 완료
                      </p>
                      <progress
                        aria-label="코스 완료 과제 수"
                        value={dashboard.passed.length}
                        max={tasks.length}
                      />
                    </div>
                    <dl className="summary-next">
                      <div>
                        <dt>
                          {dashboard.active
                            ? "이어서 학습할 과제"
                            : dashboard.passed.length === tasks.length
                              ? "코스 완료"
                              : "지금 시작할 과제"}
                        </dt>
                        <dd>
                          {dashboard.active ||
                          dashboard.passed.length < tasks.length ? (
                            <Link
                              href={
                                dashboard.active
                                  ? pageHref(
                                      dashboard.active.status === "chatting"
                                        ? "assessment"
                                        : "task",
                                    )
                                  : pageHref("preview", featured.id)
                              }
                            >
                              {featured.concept}
                              <span aria-hidden="true"> →</span>
                            </Link>
                          ) : (
                            <Link href="/history">학습 기록 보기 →</Link>
                          )}
                        </dd>
                      </div>
                      {nextTask && (
                        <div>
                          <dt>그다음 과제</dt>
                          <dd>
                            <Link href={pageHref("preview", nextTask.id)}>
                              {nextTask.concept}
                            </Link>
                          </dd>
                        </div>
                      )}
                    </dl>
                    <section className="summary-preferences">
                      <h3 className="icon-heading">
                        <Icon name="settings" />
                        나의 학습 설정
                      </h3>
                      <dl>
                        {(["purpose", "goal", "experience"] as const).map(
                          (key, index) => (
                            <div key={key}>
                              <dt>
                                {["학습 목적", "관심 분야", "현재 경험"][index]}
                              </dt>
                              <dd>{preferenceLabel(key, user?.[key] || "")}</dd>
                            </div>
                          ),
                        )}
                      </dl>
                    </section>
                    <Link className="link-button" href="/mypage">
                      학습 방향 바꾸기
                    </Link>
                  </aside>
                </div>
              </>
            )}
            {page === "preview" &&
              (selected ? (
                <>
                  <Link className="link-button back" href="/home">
                    학습으로 돌아가기
                  </Link>
                  <div className="task-layout">
                    <TaskDocument task={selected} />
                    <aside className="preview-side">
                      <h2>
                        {dashboard?.active
                          ? "과제 미리보기"
                          : "이 과제 시작하기"}
                      </h2>
                      <p>
                        지정 브랜치 <code>{selected.branch}</code>
                      </p>
                      {dashboard?.active ? (
                        <>
                          <p>
                            {dashboard.active.task_id === selected.id
                              ? "진행 중인 과제입니다."
                              : "진행 중인 과제를 마친 뒤 새 과제를 시작할 수 있습니다."}
                          </p>
                          <button
                            className="primary"
                            type="button"
                            onClick={resume}
                          >
                            진행 중인 과제 이어하기
                          </button>
                        </>
                      ) : (
                        <button
                          className="primary"
                          disabled={busy}
                          type="button"
                          onClick={() => void begin(selected.id)}
                        >
                          {busy ? "시작 중…" : "과제 시작하기"}
                        </button>
                      )}
                      {map(true)}
                    </aside>
                  </div>
                </>
              ) : (
                <div className="empty">
                  <h1>과제를 찾을 수 없습니다.</h1>
                  <Link href="/home">학습 홈으로</Link>
                </div>
              ))}
            {["task", "assessment", "result"].includes(page) &&
              !attempt &&
              !error && <p role="status">과제 기록을 불러오는 중…</p>}
            {page === "task" && attempt && (
              <>
                <Link className="link-button back" href="/home">
                  학습으로 돌아가기
                </Link>
                <div className="task-layout">
                  <TaskDocument task={attempt.task_snapshot} />
                  <aside>
                    <form
                      className="task-submission"
                      noValidate
                      onSubmit={(e) => {
                        e.preventDefault();
                        const message = validateRepository(repo);
                        setRepoTouched(true);
                        setRepoError(message);
                        if (message) {
                          repoInput.current?.focus();
                          return;
                        }
                        void assess(`/attempts/${attempt.id}/submission`, {
                          repo,
                        });
                      }}
                    >
                      <h2 className="icon-heading">
                        <Icon name="file" />
                        작업물 제출
                      </h2>
                      <p>
                        지정 브랜치에서 작업한 뒤 공개 GitHub 저장소 주소를
                        제출하세요.
                      </p>
                      <div className="branch">
                        <code>{attempt.task_snapshot.branch}</code>
                        <button
                          type="button"
                          className="copy"
                          aria-label="브랜치명 복사"
                          onClick={() => {
                            void navigator.clipboard
                              .writeText(attempt.task_snapshot.branch)
                              .then(() => setNotice("브랜치명을 복사했습니다."))
                              .catch(() =>
                                setNotice("브랜치명을 선택해 복사해 주세요."),
                              );
                          }}
                        >
                          복사
                        </button>
                      </div>
                      <label className="field-label" htmlFor="repo">
                        GitHub 저장소 URL
                      </label>
                      <input
                        id="repo"
                        ref={repoInput}
                        type="url"
                        value={repo}
                        onChange={(e) => {
                          setRepo(e.target.value);
                          if (repoTouched)
                            setRepoError(validateRepository(e.target.value));
                        }}
                        onBlur={() => {
                          setRepoTouched(true);
                          setRepoError(validateRepository(repo));
                        }}
                        aria-invalid={!!repoError}
                        aria-describedby={
                          repoError ? "repo-hint repo-error" : "repo-hint"
                        }
                        required
                        maxLength={300}
                        placeholder="https://github.com/name/cs-lab"
                        disabled={busy || pending || attempt.files.length > 0}
                      />
                      {repoError && (
                        <p id="repo-error" className="field-error" role="alert">
                          <Icon name="alert" />
                          <span>{repoError}</span>
                        </p>
                      )}
                      <p id="repo-hint" className="notice">
                        지정 브랜치에 작업물을 push하세요. 평가 시작 시 파일을
                        읽으며 대화 중 변경 내용은 반영하지 않습니다.
                      </p>
                      {attempt.files.length > 0 ? (
                        <button
                          className="primary"
                          type="button"
                          onClick={() => go("assessment")}
                        >
                          대화 이어가기
                        </button>
                      ) : (
                        <button
                          className="primary"
                          type="submit"
                          disabled={busy || pending}
                        >
                          {busy || pending
                            ? "작업물 확인 중…"
                            : "제출하고 대화하기"}
                        </button>
                      )}
                      {failed && (
                        <div className="recovery" role="alert">
                          <p>{attempt.operation?.error}</p>
                          <button
                            type="button"
                            className="link-button"
                            disabled={busy}
                            onClick={() =>
                              void assess(`/attempts/${attempt.id}/retry`)
                            }
                          >
                            다시 시도하기
                          </button>
                        </div>
                      )}
                      <p className="notice">
                        제출 기한이 없습니다. 나중에 돌아와도 이어갈 수
                        있습니다.
                      </p>
                    </form>
                  </aside>
                </div>
              </>
            )}
            {page === "assessment" && attempt && (
              <>
                <Link className="link-button back" href="/task">
                  과제 다시 보기
                </Link>
                <header className="assessment-heading">
                  <h1>{attempt.task_snapshot.concept}</h1>
                  <div className="stage" role="status">
                    <span id="criteria-progress-label">
                      확인한 항목 {attempt.progress.length} /{" "}
                      {attempt.task_snapshot.rubric.length}
                    </span>
                    <progress
                      aria-labelledby="criteria-progress-label"
                      value={attempt.progress.length}
                      max={attempt.task_snapshot.rubric.length}
                    />
                  </div>
                </header>
                <div className="assessment-layout">
                  <section className="chat">
                    <div className="chat-header">
                      <small>
                        학습자 답변{" "}
                        {
                          attempt.messages.filter((m) => m.role === "user")
                            .length
                        }{" "}
                        / 10회
                      </small>
                    </div>
                    <Transcript attempt={attempt} />
                    {(busy || pending) && (
                      <p className="chat-wait" role="status">
                        AI가 응답을 준비하고 있습니다…
                      </p>
                    )}
                    {failed && (
                      <div className="recovery" role="alert">
                        <strong>{attempt.operation?.error}</strong>
                        <button
                          className="link-button"
                          disabled={busy}
                          type="button"
                          onClick={() =>
                            void assess(`/attempts/${attempt.id}/retry`)
                          }
                        >
                          응답 다시 받기
                        </button>
                      </div>
                    )}
                    <form
                      className="chat-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        requestKey.current ||= crypto.randomUUID();
                        void assess(`/attempts/${attempt.id}/messages`, {
                          content: answer,
                          request_key: requestKey.current,
                          question_id: attempt.messages.at(-1)?.id,
                        });
                      }}
                    >
                      <label htmlFor="answer">나의 설명</label>
                      <textarea
                        id="answer"
                        value={answer}
                        onChange={(e) => {
                          setAnswer(e.target.value);
                          requestKey.current = null;
                        }}
                        placeholder="작업물의 흐름을 따라 편하게 설명해 주세요."
                        maxLength={5000}
                        required
                        disabled={
                          busy || pending || failed || !attempt.messages.length
                        }
                      />
                      <p className="notice">
                        보내지 않은 답변은 새로고침하면 사라집니다.
                      </p>
                      <div className="chat-actions">
                        <span className="small muted">
                          {answer.length} / 5,000자
                        </span>
                        <button
                          className="primary"
                          type="submit"
                          disabled={
                            busy ||
                            pending ||
                            failed ||
                            !answer.trim() ||
                            !attempt.messages.length
                          }
                        >
                          답변 보내기
                        </button>
                      </div>
                    </form>
                  </section>
                  <aside className="assessment-side">
                    <Source attempt={attempt} />
                    <section className="assessment-note">
                      <h2>함께 확인하는 항목</h2>
                      <ul>
                        {attempt.task_snapshot.rubric.map((r) => (
                          <li key={r.id}>
                            {r.title}{" "}
                            {attempt.progress.includes(r.id) ? "· 확인함" : ""}
                          </li>
                        ))}
                      </ul>
                    </section>
                  </aside>
                </div>
              </>
            )}
            {page === "result" &&
              attempt &&
              (attempt.result ? (
                <>
                  <Link className="link-button back" href="/history">
                    기록으로 돌아가기
                  </Link>
                  <div className="result-layout">
                    <article className="result-document">
                      <div
                        className={`result-status ${attempt.outcome === "fail" ? "fail" : ""}`}
                      >
                        <strong>{attempt.outcome?.toUpperCase()}</strong>
                        <span>
                          {attempt.completed_at &&
                            dateLabel(attempt.completed_at)}
                        </span>
                      </div>
                      <h1>{attempt.task_snapshot.title}</h1>
                      <p className="result-summary">{attempt.result.message}</p>
                      <section className="feedback-section">
                        <h2>잘 이해한 부분</h2>
                        <p>{attempt.result.strengths}</p>
                      </section>
                      <section className="feedback-section">
                        <h2>더 살펴볼 부분</h2>
                        <p>{attempt.result.improvements}</p>
                      </section>
                      <section className="feedback-section">
                        <h2>항목별 평가 근거</h2>
                        {attempt.result.criteria.map((c) => (
                          <div className="criterion" key={c.id}>
                            <h3>
                              {
                                attempt.task_snapshot.rubric.find(
                                  (r) => r.id === c.id,
                                )?.title
                              }{" "}
                              · {c.met ? "충족" : "보완 필요"}
                            </h3>
                            <p>{c.evidence}</p>
                          </div>
                        ))}
                      </section>
                      <div className="actions">
                        <button
                          className="primary"
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            attempt.outcome === "pass"
                              ? go("home")
                              : dashboard?.active
                                ? resume()
                                : void begin(attempt.task_id)
                          }
                        >
                          {attempt.outcome === "pass"
                            ? "다음 과제 보기"
                            : dashboard?.active
                              ? "진행 중인 과제 이어하기"
                              : "보완하고 다시 도전"}
                        </button>
                        <Link className="link-button" href="/history">
                          전체 학습 기록
                        </Link>
                      </div>
                      <details className="transcript">
                        <summary>평가 대화 다시 보기</summary>
                        <Transcript attempt={attempt} />
                      </details>
                    </article>
                    <aside className="result-side">
                      {map(true)}
                      <Source attempt={attempt} />
                      <details className="read-task">
                        <summary>당시 과제 안내 다시 보기</summary>
                        <TaskDocument task={attempt.task_snapshot} />
                      </details>
                    </aside>
                  </div>
                </>
              ) : (
                <div className="empty">
                  <h1>아직 평가가 끝나지 않았습니다.</h1>
                  <button
                    className="primary"
                    type="button"
                    onClick={() =>
                      go(attempt.status === "chatting" ? "assessment" : "task")
                    }
                  >
                    과제 이어하기
                  </button>
                </div>
              ))}
            {page === "history" && (
              <>
                <header className="page-title">
                  <div>
                    <h1>학습 기록</h1>
                  </div>
                </header>
                <div className="history-grid">
                  <div>
                    <ActivityPanel onError={handleError} />
                    <div className="section-head">
                      <h2>완료한 평가</h2>
                      <span>{records?.total || 0}건</span>
                    </div>
                    <div className="history-filters">
                      <label>
                        과제명 검색
                        <input
                          type="search"
                          value={query}
                          onChange={(e) => {
                            setQuery(e.target.value);
                            setHistoryPage(1);
                          }}
                          maxLength={100}
                          placeholder="과제명으로 검색"
                        />
                      </label>
                      <label>
                        결과
                        <select
                          value={filter}
                          onChange={(e) => {
                            setFilter(e.target.value);
                            setHistoryPage(1);
                          }}
                        >
                          <option value="">전체</option>
                          <option value="pass">PASS</option>
                          <option value="fail">FAIL</option>
                        </select>
                      </label>
                    </div>
                    {records ? (
                      records.items.length ? (
                        <div className="history-list">
                          {records.items.map((r) => (
                            <Link
                              className="history-row"
                              href={pageHref("result", "", r.id)}
                              key={r.id}
                            >
                              <span>
                                <strong>{r.title}</strong>
                                <small>{r.concept}</small>
                              </span>
                              <time dateTime={r.completed_at}>
                                {dateLabel(r.completed_at)}
                              </time>
                              <span
                                className={`outcome ${r.outcome === "fail" ? "fail" : ""}`}
                              >
                                {r.outcome.toUpperCase()}
                              </span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="empty">
                          <h3>
                            {query || filter
                              ? "조건에 맞는 기록이 없습니다."
                              : "아직 완료한 평가가 없습니다."}
                          </h3>
                          <p>
                            {query || filter
                              ? "검색어나 결과 필터를 바꾸어 보세요."
                              : "첫 과제를 마치면 대화와 피드백이 이곳에 저장됩니다."}
                          </p>
                          {query || filter ? (
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => {
                                setQuery("");
                                setFilter("");
                                setHistoryPage(1);
                              }}
                            >
                              필터 초기화
                            </button>
                          ) : (
                            <Link className="primary" href="/home">
                              과제 살펴보기
                            </Link>
                          )}
                        </div>
                      )
                    ) : (
                      <p role="status">기록을 불러오는 중…</p>
                    )}
                    {records && records.total > 20 && (
                      <div className="actions">
                        <button
                          type="button"
                          className="secondary"
                          disabled={historyPage <= 1}
                          onClick={() => setHistoryPage(historyPage - 1)}
                        >
                          이전
                        </button>
                        <span>
                          {historyPage} / {Math.ceil(records.total / 20)}
                        </span>
                        <button
                          type="button"
                          className="secondary"
                          disabled={historyPage * 20 >= records.total}
                          onClick={() => setHistoryPage(historyPage + 1)}
                        >
                          다음
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            {page === "mypage" && user && (
              <>
                <header className="page-title">
                  <div>
                    <h1>마이페이지</h1>
                  </div>
                </header>
                <div className="profile-layout">
                  <aside className="profile-account">
                    <span className="identity-avatar">
                      <Avatar seed={user.id} />
                    </span>
                    <h2>{user.name}</h2>
                    <p>@{user.handle} · GitHub 계정</p>
                    <div className="course-progress">
                      <progress
                        aria-label="코스 완료 과제 수"
                        value={dashboard?.passed.length || 0}
                        max={tasks.length}
                      />
                      <p>
                        {dashboard?.passed.length || 0} / {tasks.length} 과제
                        완료
                      </p>
                    </div>
                    <Link href="/history" className="link-button">
                      나의 학습 기록 보기
                    </Link>
                  </aside>
                  <div className="profile-main">
                    <ActivityPanel onError={handleError} />
                    <div className="profile-sections">
                      <section className="profile-section">
                        <h2 className="icon-heading">
                          <Icon name="user" />
                          계정 정보
                        </h2>
                        <form
                          className="profile-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void saveProfile({
                              name: new FormData(e.currentTarget).get("name"),
                            });
                          }}
                        >
                          <label htmlFor="display-name">
                            표시 이름
                            <input
                              key={user.name}
                              id="display-name"
                              name="name"
                              defaultValue={user.name}
                              required
                              maxLength={30}
                              autoComplete="nickname"
                            />
                          </label>
                          <button
                            className="primary"
                            disabled={busy}
                            type="submit"
                          >
                            이름 저장
                          </button>
                        </form>
                      </section>
                      <section className="profile-section">
                        <h2 className="icon-heading">
                          <Icon name="settings" />
                          학습 방향
                        </h2>
                        <p>
                          추천에 반영합니다. 진행 중인 과제는 그대로 유지됩니다.
                        </p>
                        <form
                          className="profile-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const form = new FormData(e.currentTarget);
                            void saveProfile(Object.fromEntries(form));
                          }}
                        >
                          {(["purpose", "goal", "experience"] as const).map(
                            (key, i) => (
                              <label key={key} htmlFor={`profile-${key}`}>
                                {["학습 목적", "관심 분야", "현재 경험"][i]}
                                <select
                                  key={user[key]}
                                  id={`profile-${key}`}
                                  name={key}
                                  defaultValue={user[key]}
                                >
                                  {choices[key].map(([value, title]) => (
                                    <option key={value} value={value}>
                                      {title}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ),
                          )}
                          <button
                            className="primary"
                            disabled={busy}
                            type="submit"
                          >
                            학습 방향 저장
                          </button>
                        </form>
                      </section>
                      <section className="profile-section">
                        <h2 className="icon-heading">
                          <Icon name="link" />
                          기본 제출 저장소
                        </h2>
                        <p>
                          새 과제를 시작할 때 자동 입력됩니다. 과제마다 다른
                          주소를 제출할 수도 있습니다.
                        </p>
                        <form
                          className="profile-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void saveProfile({
                              default_repo: new FormData(e.currentTarget).get(
                                "repo",
                              ),
                            });
                          }}
                        >
                          <label htmlFor="default-repo">
                            공개 GitHub 저장소 URL
                            <input
                              key={user.default_repo}
                              id="default-repo"
                              type="url"
                              name="repo"
                              maxLength={300}
                              defaultValue={user.default_repo}
                              placeholder="https://github.com/name/cs-lab"
                            />
                          </label>
                          <p className="notice">
                            비워서 저장하면 기본 저장소를 해제합니다.
                          </p>
                          <button
                            className="primary"
                            disabled={busy}
                            type="submit"
                          >
                            기본 저장소 저장
                          </button>
                        </form>
                      </section>
                      <section className="profile-section">
                        <h2>로그아웃</h2>
                        <p>학습 기록은 계정에 보관됩니다.</p>
                        <button
                          className="secondary"
                          disabled={busy}
                          type="button"
                          onClick={() => void logout()}
                        >
                          로그아웃
                        </button>
                      </section>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
      <dialog
        className="login-dialog"
        ref={loginDialog}
        aria-labelledby="login-dialog-title"
        onCancel={(e) => {
          e.preventDefault();
          closeLogin();
        }}
      >
        <div className="login-dialog-body">
          <h2 id="login-dialog-title" aria-label="smallbyte에 로그인">
            <Logo />
          </h2>
          <div className="login-connection" aria-hidden="true">
            <span className="login-provider-brand">
              <Logo />
            </span>
            <i />
            <span>
              <GitHubIcon />
            </span>
          </div>
          <p className="login-prompt">GitHub 계정으로 시작하세요.</p>
          <a className="primary" href="/api/auth/github">
            <GitHubIcon />
            GitHub로 로그인
          </a>
          <button
            className="login-dialog-close"
            type="button"
            aria-label="로그인 창 닫기"
            onClick={closeLogin}
          >
            <Icon name="close" />
          </button>
        </div>
      </dialog>
    </>
  );
}
