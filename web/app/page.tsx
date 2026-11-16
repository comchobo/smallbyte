"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Source, Transcript } from "@/components/attempt-panels";
import { CourseMap } from "@/components/course-map";
import { GitHubIcon, UserIcon } from "@/components/icons";
import { Meta, TaskDocument } from "@/components/task-document";
import {
  type Activity,
  ApiError,
  type Attempt,
  api,
  choices,
  type Dashboard,
  dateLabel,
  type History,
  onboardingQuestions,
  type Preferences,
  preferenceKeys,
  preferenceLabel,
  preferenceLabels,
  type Task,
  type User,
} from "@/lib/learning";

type Route = { page: string; task: string; record: string };
const pages = [
  "landing",
  "login",
  "onboarding",
  "home",
  "preview",
  "task",
  "assessment",
  "result",
  "history",
  "mypage",
];
const titles: Record<string, string> = {
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

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [route, setRoute] = useState<Route>({
    page: "landing",
    task: "",
    record: "",
  });
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

  const go = useCallback((page: string, task = "", record = "") => {
    window.location.hash = new URLSearchParams({
      page,
      ...(task ? { task } : {}),
      ...(record ? { record } : {}),
    }).toString();
  }, []);
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
        go("login");
      } else
        setError(
          e instanceof Error
            ? e.message
            : "처리하지 못했습니다. 다시 시도해 주세요.",
        );
    },
    [go],
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
    const read = () => {
      const p = new URLSearchParams(window.location.hash.slice(1));
      const page = p.get("page") || "landing";
      setRoute({
        page: pages.includes(page) ? page : "home",
        task: p.get("task") || "",
        record: p.get("record") || "",
      });
      setError("");
      setAnswer("");
      requestKey.current = null;
      window.scrollTo({ top: 0 });
      main.current?.focus();
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
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
    const generation = ++routeGeneration.current;
    setAttempt(null);
    if (loading || !user || !["task", "assessment", "result"].includes(page))
      return;
    const id = page === "result" ? route.record : dashboard?.active?.id;
    if (!id) {
      if (page !== "result") go("home");
      else setError("기록을 찾을 수 없습니다.");
      return;
    }
    api<Attempt>(`/attempts/${id}`)
      .then((a) => {
        if (generation !== routeGeneration.current) return;
        setAttempt(a);
        setRepo(a.repo);
        if (a.status === "completed" && page !== "result")
          go("result", "", a.id);
      })
      .catch((e) => {
        if (generation === routeGeneration.current) handleError(e);
      });
  }, [
    loading,
    page,
    route.record,
    user,
    dashboard?.active?.id,
    go,
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
            go("result", "", a.id);
          }
        })
        .catch(handleError);
    }, 3000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [attempt, go, handleError]);

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

  const forgetSentAnswer = useCallback((a: Attempt) => {
    if (
      a.messages.some(
        (m) => m.role === "user" && m.request_key === requestKey.current,
      )
    ) {
      setAnswer("");
      requestKey.current = null;
    }
  }, []);
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
        forgetSentAnswer(a);
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
            forgetSentAnswer(a);
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
      if (page === "onboarding") go("home");
    });
  }
  const ordered = dashboard?.order || ["dns", "http", "cache", "session"];
  const selected = tasks.find((t) => t.id === route.task);
  const focus = dashboard?.recommended || ordered[0];
  const featured = tasks.find((t) => t.id === focus);
  const pending = attempt?.operation?.status === "running";
  const failed = attempt?.operation?.status === "failed";
  const ready = Boolean(user?.onboarding_complete);
  const preferenceStep = preferenceKeys[step];
  const map = (mini = false, target = focus) => (
    <CourseMap
      tasks={tasks}
      order={ordered}
      passed={dashboard?.passed}
      focus={target}
      mini={mini}
      onSelect={(id) => go("preview", id)}
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
          <a className="brand" href={user ? "#page=home" : "#page=landing"}>
            smallbyte<span>.</span>
          </a>
          {ready && (
            <nav className="nav" aria-label="주요 메뉴">
              <a
                href="#page=home"
                aria-current={
                  !["history", "result", "mypage"].includes(page)
                    ? "page"
                    : undefined
                }
              >
                학습
              </a>
              <a
                href="#page=history"
                aria-current={
                  ["history", "result"].includes(page) ? "page" : undefined
                }
              >
                기록
              </a>
            </nav>
          )}
          <div className="header-right">
            {ready ? (
              <a
                className="avatar-link"
                href="#page=mypage"
                aria-label={`${user?.name}님의 마이페이지`}
              >
                <UserIcon />
              </a>
            ) : user ? (
              <span className="small muted">GitHub 연결됨</span>
            ) : (
              <a href="#page=login">로그인</a>
            )}
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
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        {errorUI}
        {loading ? (
          <div className="empty" role="status">
            <h1>학습 정보를 불러오는 중</h1>
            <p>계정과 학습 기록을 확인합니다.</p>
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
                  <a className="primary" href="#page=login">
                    <GitHubIcon />
                    GitHub로 시작하기
                  </a>
                  <p className="notice">
                    첫 로그인 후, 학습 목적과 경험을 설정합니다.
                  </p>
                  <div className="entry-process">
                    <span>
                      <strong>나에게 맞는 코스</strong>정해진 순서 없이
                    </span>
                    <span>
                      <strong>작은 실험과 과제</strong>마감 없이 내 속도로
                    </span>
                    <span>
                      <strong>작업물에 대한 대화</strong>이해와 성장 중심으로
                    </span>
                  </div>
                </section>
                <section className="entry-example" aria-label="학습 코스 예시">
                  <div className="example-head">
                    <span>예시 코스 · 4개 컨트롤</span>
                    <span>웹 CS</span>
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
                  <div className="example-bottom">
                    같은 요청인데 왜 200 또는 304일까요?
                  </div>
                </section>
              </div>
            )}
            {page === "login" && (
              <div className="auth-layout">
                <section className="auth-info">
                  <a className="link-button" href="#page=landing">
                    서비스 소개로
                  </a>
                  <h1>smallbyte에 로그인</h1>
                  <p>
                    GitHub 계정 하나로 시작합니다. 처음이라면 로그인 후 학습
                    방향을 설정합니다.
                  </p>
                  <ol className="flow-list">
                    <li>
                      <strong>작은 과제 수행</strong>
                      <span>개념 하나를 직접 적용합니다.</span>
                    </li>
                    <li>
                      <strong>공개 GitHub 저장소 제출</strong>
                      <span>지정 브랜치의 작업물을 읽습니다.</span>
                    </li>
                    <li>
                      <strong>대화로 이해도 확인</strong>
                      <span>판정과 피드백이 기록됩니다.</span>
                    </li>
                  </ol>
                  {map(true)}
                </section>
                <section className="auth-panel">
                  <h2>GitHub로 계속하기</h2>
                  <p>인증 후 다른 기기에서도 학습 기록을 이어갑니다.</p>
                  <div className="auth-identity">
                    <GitHubIcon />
                    <div>
                      <strong>GitHub 계정</strong>
                      <small>공개 프로필로 로그인합니다.</small>
                    </div>
                  </div>
                  {typeof window !== "undefined" &&
                    new URLSearchParams(window.location.search).get("auth") ===
                      "failed" && (
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
                  <p>세 가지만 알려주시면 첫 과제를 추천합니다.</p>
                  <ol className="step-list">
                    {preferenceKeys.map((key, i) => (
                      <li
                        key={key}
                        className={
                          i === step ? "current" : i < step ? "done" : ""
                        }
                        aria-current={i === step ? "step" : undefined}
                      >
                        <span className="step-number">{i + 1}</span>
                        {preferenceLabels[key]}
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
                  <h2>{onboardingQuestions[step]}</h2>
                  <p>
                    가장 가까운 항목을 골라 주세요. 나중에 바꿀 수 있습니다.
                  </p>
                  <fieldset className="option-list">
                    <legend className="sr-only">
                      {preferenceLabels[preferenceStep]}
                    </legend>
                    {choices[preferenceStep].map(([value, title, desc]) => (
                      <label key={value} className="option">
                        <input
                          type="radio"
                          name={preferenceStep}
                          value={value}
                          checked={preferences[preferenceStep] === value}
                          onChange={() =>
                            setPreferences({
                              ...preferences,
                              [preferenceStep]: value,
                            })
                          }
                          required
                        />
                        <span>
                          <strong>{title}</strong>
                          <small>{desc}</small>
                        </span>
                      </label>
                    ))}
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
                    <p>
                      {dashboard.active
                        ? "진행하던 과제를 이어서 학습하세요."
                        : "관심 분야와 경험을 바탕으로 고른 코스입니다."}
                    </p>
                  </div>
                </header>
                {dashboard.passed.length === tasks.length &&
                  !dashboard.active && (
                    <section className="all-complete">
                      <h2>모든 컨트롤을 펀치했습니다.</h2>
                      <p>
                        기록에서 피드백을 다시 보거나 과제를 다시 수행할 수
                        있습니다.
                      </p>
                      <a className="link-button" href="#page=history">
                        학습 기록 보기
                      </a>
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
                        <span>제출 마감 없음 · 내 속도로</span>
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
                      <span>자유롭게 살펴보세요</span>
                    </div>
                    <div className="task-list">
                      {ordered
                        .filter((id) => id !== featured.id)
                        .map((id) => {
                          const t = tasks.find((t) => t.id === id);
                          return (
                            t && (
                              <a
                                className="task-row"
                                href={`#page=preview&task=${id}`}
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
                              </a>
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
                    <a className="link-button" href="#page=mypage">
                      학습 방향 바꾸기
                    </a>
                    <p className="notice">
                      추천은 출발점일 뿐입니다. 궁금한 개념부터 선택해도
                      좋습니다.
                    </p>
                  </aside>
                </div>
              </>
            )}
            {page === "preview" &&
              (selected ? (
                <>
                  <a className="link-button back" href="#page=home">
                    학습으로 돌아가기
                  </a>
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
                        예상 {selected.minutes}분. 마감 없이 자신의 속도로
                        학습합니다.
                      </p>
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
                  <a href="#page=home">학습 홈으로</a>
                </div>
              ))}
            {["task", "assessment", "result"].includes(page) &&
              !attempt &&
              !error && <p role="status">과제 기록을 불러오는 중…</p>}
            {page === "task" && attempt && (
              <>
                <a className="link-button back" href="#page=home">
                  학습으로 돌아가기
                </a>
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
                      <h2>작업물 연결</h2>
                      <p>
                        아래 브랜치에서 작업한 뒤 공개 저장소 주소를 제출하세요.
                      </p>
                      <label className="field-label" htmlFor="repo">
                        GitHub 저장소 URL
                      </label>
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
                            저장된 요청 다시 시도
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
                <a className="link-button back" href="#page=task">
                  과제 다시 보기
                </a>
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
                      <strong>작업물에서 시작하는 대화</strong>
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
                        작업물을 살펴보고 있습니다. 답변은 서버에 저장됩니다.
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
                        진행도는 합격 확률이 아닙니다. AI가 확인을 마치면 최종
                        결과를 안내합니다. 미전송 답변은 새로고침하면
                        사라집니다.
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
                  <a className="link-button back" href="#page=history">
                    기록으로 돌아가기
                  </a>
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
                        <a className="link-button" href="#page=history">
                          전체 학습 기록
                        </a>
                      </div>
                      <details className="transcript">
                        <summary>평가 대화 다시 보기</summary>
                        <Transcript attempt={attempt} />
                      </details>
                      <p className="notice">
                        평가 모델: {attempt.model} · 과제 버전{" "}
                        {attempt.task_snapshot.version}
                        <br />
                        제출 자료와 대화에 근거한 AI 평가이며 실행 테스트 결과가
                        아닙니다.
                      </p>
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
                  <h1>아직 평가 중인 과제입니다.</h1>
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
                    <p>수행한 과제와 대화, 피드백을 다시 꺼내 봅니다.</p>
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
                        색이 진할수록 학습 활동이 많습니다.
                      </p>
                      <p className="notice">
                        과제 시작·자료 제출·AI 응답·평가 완료 활동입니다.
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
                            <a
                              className="history-row"
                              href={`#page=result&record=${r.id}`}
                              key={r.id}
                            >
                              <span>
                                <strong>{r.title}</strong>
                                <small>{r.concept} · 대화와 피드백</small>
                              </span>
                              <time dateTime={r.completed_at}>
                                {dateLabel(r.completed_at)}
                              </time>
                              <span
                                className={`outcome ${r.outcome === "fail" ? "fail" : ""}`}
                              >
                                {r.outcome.toUpperCase()}
                              </span>
                            </a>
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
                            <a className="primary" href="#page=home">
                              과제 보러 가기
                            </a>
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
                  <aside className="history-side">
                    <h2>기록에 남는 것</h2>
                    <p>
                      당시 과제 안내와 제출 파일, 평가 대화, PASS·FAIL 결과와
                      보완점을 함께 보관합니다.
                    </p>
                    <p className="notice">
                      기록은 계정에 저장되어 다른 기기에서도 확인할 수 있습니다.
                    </p>
                  </aside>
                </div>
              </>
            )}
            {page === "mypage" && user && (
              <>
                <header className="page-title">
                  <div>
                    <h1>마이페이지</h1>
                    <p>계정과 학습 방향, 기본 제출 저장소를 관리합니다.</p>
                  </div>
                </header>
                <div className="profile-layout">
                  <aside className="profile-account">
                    <span className="identity-avatar">
                      <UserIcon />
                    </span>
                    <h2>{user.name}</h2>
                    <p>@{user.handle} · GitHub 계정</p>
                    <span className="tag olive">GitHub 연결됨</span>
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
                    <a href="#page=history" className="link-button">
                      나의 학습 기록 보기
                    </a>
                  </aside>
                  <div className="profile-sections">
                    <section className="profile-section">
                      <h2>계정 정보</h2>
                      <dl className="profile-definition">
                        <div>
                          <dt>로그인 방식</dt>
                          <dd>GitHub</dd>
                        </div>
                        <div>
                          <dt>GitHub 계정</dt>
                          <dd>@{user.handle}</dd>
                        </div>
                      </dl>
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
                        {preferenceKeys.map((key) => (
                          <label key={key} htmlFor={`profile-${key}`}>
                            {preferenceLabels[key]}
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
                        ))}
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
                            go("landing");
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
      <footer className="footer">
        <div className="footer-inner">
          <span>smallbyte · 작은 실험으로 이해하는 웹 CS</span>
          <span>공개 저장소 · 작업물 기반 AI 대화</span>
        </div>
      </footer>
    </>
  );
}
