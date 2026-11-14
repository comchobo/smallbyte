"use client";

import { useCallback, useEffect, useState } from "react";
import { checkHealth } from "@/lib/api";

type Status = "checking" | "ok" | "error";
const labels: Record<Status, string> = {
  checking: "확인 중…",
  ok: "연결됨",
  error: "연결 실패",
};

export default function Home() {
  const [status, setStatus] = useState<{ api: Status; db: Status }>({
    api: "checking",
    db: "checking",
  });
  const [checking, setChecking] = useState(true);
  const refresh = useCallback(async () => {
    setChecking(true);
    setStatus({ api: "checking", db: "checking" });
    const results = await Promise.allSettled([
      checkHealth("live"),
      checkHealth("ready"),
    ]);
    const state = (result: PromiseSettledResult<boolean>): Status =>
      result.status === "fulfilled" && result.value ? "ok" : "error";
    setStatus({ api: state(results[0]), db: state(results[1]) });
    setChecking(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <>
      <header className="border-b border-line bg-white px-6 py-5 sm:px-10">
        <div className="mx-auto max-w-3xl text-2xl font-extrabold tracking-tight">
          small<span className="text-accent">byte</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-14 sm:px-10 sm:py-20">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          개발의 시작, 연결부터.
        </h1>
        <p className="mt-5 max-w-prose text-muted">
          smallbyte 애플리케이션의 기본 실행 환경입니다.
          <br />
          API와 데이터베이스가 연결되어 있는지 확인하세요.
        </p>
        <section aria-labelledby="health-heading" className="mt-12">
          <h2 id="health-heading" className="text-lg font-semibold">
            서비스 연결 상태
          </h2>
          <div aria-live="polite" aria-busy={checking}>
            <dl className="mt-4 border-t border-line">
              {(
                [
                  ["FastAPI", status.api],
                  ["PostgreSQL", status.db],
                ] as const
              ).map(([name, value]) => (
                <div
                  key={name}
                  className="flex justify-between gap-6 border-b border-line py-4"
                >
                  <dt>{name}</dt>
                  <dd
                    className={
                      value === "error"
                        ? "text-danger"
                        : value === "ok"
                          ? "text-accent"
                          : "text-muted"
                    }
                  >
                    {labels[value]}
                  </dd>
                </div>
              ))}
            </dl>
            {(status.api === "error" || status.db === "error") && (
              <p className="mt-4 text-sm text-danger">
                연결할 수 없습니다. API와 DB 서비스의 실행 상태를 확인한 뒤 다시
                시도하세요.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={checking}
            className="mt-6 min-h-11 cursor-pointer rounded border border-ink bg-ink px-5 py-2 text-sm font-semibold text-white hover:bg-accent disabled:cursor-wait disabled:opacity-50"
          >
            {checking ? "연결 확인 중…" : "다시 확인"}
          </button>
        </section>
      </main>
    </>
  );
}
