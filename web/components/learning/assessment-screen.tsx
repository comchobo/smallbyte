"use client";

import Link from "next/link";
import { Source, Transcript } from "@/components/attempt-panels";
import type { Attempt } from "@/lib/learning";

export function AssessmentScreen({
  attempt,
  answer,
  busy,
  pending,
  failed,
  onAnswerChange,
  onSubmit,
  onRetry,
}: {
  attempt: Attempt;
  answer: string;
  busy: boolean;
  pending: boolean;
  failed: boolean;
  onAnswerChange: (value: string) => void;
  onSubmit: () => void;
  onRetry: () => void;
}) {
  return (
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
              {attempt.messages.filter((m) => m.role === "user").length} / 10회
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
                onClick={onRetry}
              >
                응답 다시 받기
              </button>
            </div>
          )}
          <form
            className="chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            <label htmlFor="answer">나의 설명</label>
            <textarea
              id="answer"
              value={answer}
              onChange={(e) => onAnswerChange(e.target.value)}
              placeholder="작업물의 흐름을 따라 편하게 설명해 주세요."
              maxLength={5000}
              required
              disabled={busy || pending || failed || !attempt.messages.length}
            />
            <p className="notice">
              보내지 않은 답변은 새로고침하면 사라집니다.
            </p>
            <div className="chat-actions">
              <span className="small muted">{answer.length} / 5,000자</span>
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
                  {r.title} {attempt.progress.includes(r.id) ? "· 확인함" : ""}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
