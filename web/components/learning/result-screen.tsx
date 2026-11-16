"use client";

import Link from "next/link";
import { Source, Transcript } from "@/components/attempt-panels";
import type { CourseMapRenderer, Navigate } from "@/components/learning/types";
import { TaskDocument } from "@/components/task-document";
import { type Attempt, type Dashboard, dateLabel } from "@/lib/learning";

export function ResultScreen({
  attempt,
  dashboard,
  busy,
  map,
  onGo,
  onResume,
  onBegin,
}: {
  attempt: Attempt;
  dashboard: Dashboard | null;
  busy: boolean;
  map: CourseMapRenderer;
  onGo: Navigate;
  onResume: () => void;
  onBegin: (taskId: string) => void;
}) {
  if (!attempt.result) {
    return (
      <div className="empty">
        <h1>아직 평가가 끝나지 않았습니다.</h1>
        <button
          className="primary"
          type="button"
          onClick={() =>
            onGo(attempt.status === "chatting" ? "assessment" : "task")
          }
        >
          과제 이어하기
        </button>
      </div>
    );
  }
  return (
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
              {attempt.completed_at && dateLabel(attempt.completed_at)}
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
                    attempt.task_snapshot.rubric.find((r) => r.id === c.id)
                      ?.title
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
                  ? onGo("home")
                  : dashboard?.active
                    ? onResume()
                    : void onBegin(attempt.task_id)
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
  );
}
