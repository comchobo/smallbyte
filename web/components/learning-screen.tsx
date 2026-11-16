"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CourseMap } from "@/components/course-map";
import { LeaderboardPanel } from "@/components/leaderboard-panel";
import { AssessmentScreen } from "@/components/learning/assessment-screen";
import { EntryScreen } from "@/components/learning/entry-screen";
import { HistoryScreen } from "@/components/learning/history-screen";
import { HomeScreen } from "@/components/learning/home-screen";
import { LoginDialog } from "@/components/learning/login-dialog";
import { OnboardingScreen } from "@/components/learning/onboarding-screen";
import { PreviewScreen } from "@/components/learning/preview-screen";
import { ProfileScreen } from "@/components/learning/profile-screen";
import { ResultScreen } from "@/components/learning/result-screen";
import { TaskScreen } from "@/components/learning/task-screen";
import { SiteHeader } from "@/components/site-header";
import {
  ApiError,
  type Attempt,
  api,
  type Dashboard,
  type History,
  type Preferences,
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
  leaderboard: "리더보드",
  mypage: "마이페이지",
};

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
      activeTaskId={dashboard?.active?.task_id}
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
  const changeAnswer = (value: string) => {
    setAnswer(value);
    requestKey.current = null;
  };
  const submitAnswer = () => {
    if (!attempt) return;
    requestKey.current ||= crypto.randomUUID();
    void assess(`/attempts/${attempt.id}/messages`, {
      content: answer,
      request_key: requestKey.current,
      question_id: attempt.messages.at(-1)?.id,
    });
  };
  const retryAssessment = () => {
    if (attempt) void assess(`/attempts/${attempt.id}/retry`);
  };

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
      <SiteHeader
        page={page}
        user={user}
        ready={ready}
        busy={busy}
        onLogout={() => void logout()}
      />
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
              <EntryScreen
                tasks={tasks}
                user={user}
                entryHref={entryHref}
                entryLabel={entryLabel}
              />
            )}
            {page === "onboarding" && (
              <OnboardingScreen
                preferences={preferences}
                step={step}
                busy={busy}
                onStepChange={setStep}
                onPreferencesChange={setPreferences}
                onSave={saveProfile}
              />
            )}
            {page === "home" && dashboard && featured && (
              <HomeScreen
                tasks={tasks}
                dashboard={dashboard}
                user={user}
                featured={featured}
                nextTask={nextTask}
                map={map}
                onResume={resume}
                onGo={go}
              />
            )}
            {page === "preview" && (
              <PreviewScreen
                selected={selected}
                dashboard={dashboard}
                busy={busy}
                map={map}
                onBegin={begin}
                onResume={resume}
              />
            )}
            {["task", "assessment", "result"].includes(page) &&
              !attempt &&
              !error && <p role="status">과제 기록을 불러오는 중…</p>}
            {page === "task" && attempt && (
              <TaskScreen
                attempt={attempt}
                busy={busy}
                pending={pending}
                failed={failed}
                repo={repo}
                repoError={repoError}
                repoTouched={repoTouched}
                onRepoChange={setRepo}
                onRepoError={setRepoError}
                onRepoTouchedChange={setRepoTouched}
                onAssess={assess}
                onGo={go}
                onNotice={setNotice}
              />
            )}
            {page === "assessment" && attempt && (
              <AssessmentScreen
                attempt={attempt}
                answer={answer}
                busy={busy}
                pending={pending}
                failed={failed}
                onAnswerChange={changeAnswer}
                onSubmit={submitAnswer}
                onRetry={retryAssessment}
              />
            )}
            {page === "result" && attempt && (
              <ResultScreen
                attempt={attempt}
                dashboard={dashboard}
                busy={busy}
                map={map}
                onGo={go}
                onResume={resume}
                onBegin={begin}
              />
            )}
            {page === "leaderboard" && user && (
              <LeaderboardPanel userId={user.id} onError={handleError} />
            )}
            {page === "history" && (
              <HistoryScreen
                records={records}
                query={query}
                filter={filter}
                historyPage={historyPage}
                onQueryChange={setQuery}
                onFilterChange={setFilter}
                onPageChange={setHistoryPage}
                onError={handleError}
              />
            )}
            {page === "mypage" && user && (
              <ProfileScreen
                user={user}
                tasks={tasks}
                dashboard={dashboard}
                busy={busy}
                onSaveProfile={saveProfile}
                onLogout={() => void logout()}
                onError={handleError}
              />
            )}
          </>
        )}
      </main>
      <LoginDialog dialogRef={loginDialog} onClose={closeLogin} />
    </>
  );
}
