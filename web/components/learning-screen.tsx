"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CourseMap } from "@/components/course-map";
import {
  type Activity,
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
function UserIcon() {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </svg>
  );
}
function Meta({ task }: { task: Task }) {
  return (
    <div className="meta">
      <span>{task.area}</span>
      <span>형식·언어 자유</span>
      <span>예상 {task.minutes}분</span>
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
function TaskDocument({ task }: { task: Task }) {
  return (
    <article className="task-document">
      <h1>{task.title}</h1>
      <Meta task={task} />
      <p className="task-problem">{task.problem}</p>
      <section className="document-section">
        <h2>완료 조건</h2>
        <ul className="requirements">
          {task.requirements.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
      <section className="document-section">
        <h2>직접 해 볼 순서</h2>
        <ol className="requirements">
          {task.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>
      <section className="document-section">
        <h2>실험의 출발점</h2>
        <div className="code-panel">
          <pre>
            <code>{task.starter}</code>
          </pre>
        </div>
      </section>
      <details className="read-task">
        <summary>막힐 때 살펴볼 힌트</summary>
        <ul className="requirements">
          {task.hints.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </details>
      <section className="document-section">
        <h2>제출 안내</h2>
        <p>{task.submission_guidance}</p>
        <p className="notice">
          파일 형식은 자유입니다. 평가 대상 텍스트 파일 전체는 200KB 이내여야
          합니다. 의존성·빌드 산출물·바이너리는 읽지 않습니다.
        </p>
      </section>
      <section className="document-section">
        <h2>대화에서 확인할 개념</h2>
        <ul className="requirements">
          {task.rubric.map((r) => (
            <li key={r.id}>{r.title}</li>
          ))}
        </ul>
      </section>
    </article>
  );
}

export function LearningScreen({
  route,
  authFailed = false,
  sessionExpired = false,
}: {
  route: LearningRoute;
  authFailed?: boolean;
  sessionExpired?: boolean;
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
  const [answer, setAnswer] = useState("");
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState<Preferences>({
    purpose: "",
    goal: "",
    experience: "",
  });
  const [records, setRecords] = useState<History | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const main = useRef<HTMLElement>(null);
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
        router.replace("/login?reason=expired");
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
        : "login"
      : !user.onboarding_complete
        ? "onboarding"
        : ["landing", "login", "onboarding"].includes(route.page)
          ? "home"
          : route.page;
  useEffect(() => {
    document.title = `${titles[page] || "학습"} · smallbyte`;
  }, [page]);
  useEffect(() => {
    if (!loading && page !== route.page) router.replace(pageHref(page));
  }, [loading, page, route.page, router]);

  useEffect(() => {
    const generation = ++routeGeneration.current;
    setAttempt(null);
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
      Promise.all([
        api<History>(`/history?${params}`),
        api<Activity>("/activity"),
      ])
        .then(([h, a]) => {
          if (!stopped) {
            setRecords(h);
            setActivity(a);
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
  const ordered = dashboard?.order || ["dns", "http", "cache", "session"];
  const selected = tasks.find((t) => t.id === route.task);
  const focus = dashboard?.recommended || ordered[0];
  const featured = tasks.find((t) => t.id === focus);
  const pending = attempt?.operation?.status === "running";
  const failed = attempt?.operation?.status === "failed";
  const ready = Boolean(user?.onboarding_complete);
  const map = (mini = false, target = focus) => (
    <CourseMap
      tasks={tasks}
      order={ordered}
      passed={dashboard?.passed}
      focus={target}
      mini={mini}
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
          <Link className="brand" href={user ? "/home" : "/"}>
            smallbyte<span>.</span>
          </Link>
          {ready && (
            <nav className="nav" aria-label="주요 메뉴">
              <Link
                href="/home"
                aria-current={
                  !["history", "result", "mypage"].includes(page)
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
            {ready ? (
              <Link
                className="avatar-link"
                href="/mypage"
                aria-label={`${user?.name}님의 마이페이지`}
              >
                <UserIcon />
              </Link>
            ) : user ? (
              <span className="small muted">GitHub 연결됨</span>
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
        {(notice || sessionExpired) && (
          <p className="notice" role="status">
            {notice ||
              "로그인 유효기간이 만료되었습니다. GitHub로 다시 로그인해 주세요."}
          </p>
        )}
        {errorUI}
        {loading ? (
          <div className="empty" role="status">
            <h1>학습 정보를 불러오는 중…</h1>
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty">
            <h1>학습 정보를 불러오지 못했습니다.</h1>
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
            {page === "landing" && (
              <div className="entry">
                <section className="entry-copy">
                  <h1>
                    개념을 지형으로,
                    <br />
                    <em>배움을 코스로.</em>
                  </h1>
                  <p>
                    CS와 웹의 원리를 작은 실험으로 익힙니다. 나에게 맞는 코스를
                    따라가고, 작업물에 대한 대화로 이해를 확인하세요.
                  </p>
                  <Link className="primary" href="/login">
                    <GitHubIcon />
                    GitHub로 시작하기
                  </Link>
                </section>
                <section className="entry-example" aria-label="학습 코스 예시">
                  <div className="example-head">
                    <span>예시 코스 · 4개 컨트롤</span>
                  </div>
                  {map(true, "cache")}
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
            )}
            {page === "login" && (
              <div className="auth-layout">
                <section className="auth-info">
                  <Link className="link-button" href="/">
                    서비스 소개로
                  </Link>
                  <h1>smallbyte에 로그인</h1>
                  <p>
                    처음 로그인하면 학습 목적과 경험에 맞춰 코스를 설정합니다.
                  </p>
                </section>
                <section className="auth-panel" aria-label="GitHub 로그인">
                  {authFailed && (
                    <p className="error" role="alert">
                      GitHub 로그인을 완료하지 못했습니다. 다시 시도해 주세요.
                    </p>
                  )}
                  <a className="primary" href="/api/auth/github">
                    <GitHubIcon />
                    GitHub로 로그인
                  </a>
                  <p className="notice">
                    제출은 공개 저장소만 지원합니다. 저장소 쓰기 권한은 요청하지
                    않습니다.
                  </p>
                </section>
              </div>
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
                    <h1>나의 학습</h1>
                  </div>
                </header>
                {dashboard.passed.length === tasks.length &&
                  !dashboard.active && (
                    <section className="all-complete">
                      <h2>모든 컨트롤을 완료했습니다.</h2>
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
                    <article className="feature">
                      <div className="feature-body">
                        <div className="feature-head">
                          <h2>{featured.title}</h2>
                          <span className="tag">
                            {dashboard.active ? "진행 중" : "추천 컨트롤"}
                          </span>
                        </div>
                        <Meta task={featured} />
                        <p className="feature-description">
                          {featured.description}
                        </p>
                        <div className="feature-preview">
                          <div>
                            <h3>직접 해 볼 일</h3>
                            <p>{featured.requirements[0]}</p>
                          </div>
                          <div>
                            <h3>학습 후 설명할 수 있는 것</h3>
                            <p>{featured.rubric[0]?.title}</p>
                          </div>
                        </div>
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
                    <div className="section-head">
                      <h2>다른 컨트롤</h2>
                    </div>
                    <div className="task-list">
                      {ordered
                        .filter((id) => id !== featured.id)
                        .map((id) => {
                          const t = tasks.find((t) => t.id === id);
                          return (
                            t && (
                              <Link
                                className="task-row"
                                href={pageHref("preview", id)}
                                key={id}
                              >
                                <span className="order">
                                  {ordered.indexOf(id) + 1}
                                </span>
                                <span>
                                  <strong>{t.title}</strong>
                                  <small>
                                    {t.concept} · {t.minutes}분
                                  </small>
                                </span>
                                <span className="tag olive">
                                  {dashboard.passed.includes(id)
                                    ? "완료"
                                    : "살펴보기"}
                                </span>
                              </Link>
                            )
                          );
                        })}
                    </div>
                  </div>
                  <aside className="profile-summary">
                    <h2>{user?.name}님의 코스</h2>
                    <p>{preferenceLabel("purpose", user?.purpose || "")}</p>
                    <p>{preferenceLabel("goal", user?.goal || "")}</p>
                    <p>
                      {preferenceLabel("experience", user?.experience || "")}
                    </p>
                    <div className="course-progress">
                      <progress
                        aria-label="코스 완료 과제 수"
                        value={dashboard.passed.length}
                        max={tasks.length}
                      />
                      <p>
                        {dashboard.passed.length} / {tasks.length} 컨트롤 완료
                      </p>
                    </div>
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
                      {map(true, selected.id)}
                      <h2>
                        {dashboard?.active
                          ? "과제 미리보기"
                          : "이 컨트롤 시작하기"}
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
                      onSubmit={(e) => {
                        e.preventDefault();
                        void assess(`/attempts/${attempt.id}/submission`, {
                          repo,
                        });
                      }}
                    >
                      <h2>작업물 제출</h2>
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
                        type="url"
                        value={repo}
                        onChange={(e) => setRepo(e.target.value)}
                        required
                        maxLength={300}
                        placeholder="https://github.com/name/cs-lab"
                        disabled={busy || pending || attempt.files.length > 0}
                      />
                      <p className="notice">
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
                      {map(true, attempt.task_id)}
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
                    <section className="activity">
                      <div className="section-head">
                        <h2>학습 활동</h2>
                        <span>최근 26주 · 한국 시간</span>
                      </div>
                      <div
                        className="heatmap"
                        role="img"
                        aria-label="최근 26주 학습 활동. 색이 짙을수록 활동이 많습니다."
                      >
                        {activity?.days.map((day) => (
                          <span
                            key={day.date}
                            className={`heat-cell ${day.date > (activity?.today || "") ? "future" : ""}`}
                            data-level={Math.min(3, day.count)}
                            title={`${day.date} · 활동 ${day.count}회`}
                          />
                        ))}
                      </div>
                      {activity && (
                        <div className="heat-labels">
                          <span>{activity.start}부터</span>
                          <span>{activity.today} 오늘까지</span>
                        </div>
                      )}
                      <p className="notice">
                        과제 시작·제출·AI 응답·평가 완료를 기록합니다. 색이
                        짙을수록 활동이 많습니다.
                      </p>
                    </section>
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
                      <UserIcon />
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
                        {dashboard?.passed.length || 0} / {tasks.length} 컨트롤
                        완료
                      </p>
                    </div>
                    <Link href="/history" className="link-button">
                      나의 학습 기록 보기
                    </Link>
                  </aside>
                  <div className="profile-sections">
                    <section className="profile-section">
                      <h2>계정 정보</h2>
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
                      <h2>학습 방향</h2>
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
                      <h2>기본 제출 저장소</h2>
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
                        onClick={() =>
                          void action(async () => {
                            await api("/auth/logout", "POST");
                            setUser(null);
                            setDashboard(null);
                            setAttempt(null);
                            setAnswer("");
                            router.replace("/");
                          })
                        }
                      >
                        로그아웃
                      </button>
                    </section>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
