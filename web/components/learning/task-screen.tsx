"use client";

import Link from "next/link";
import { useRef } from "react";
import { Icon } from "@/components/icons";
import type { Navigate } from "@/components/learning/types";
import { TaskDocument } from "@/components/task-document";
import type { Attempt } from "@/lib/learning";

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

export function TaskScreen({
  attempt,
  busy,
  pending,
  failed,
  repo,
  repoError,
  repoTouched,
  onRepoChange,
  onRepoError,
  onRepoTouchedChange,
  onAssess,
  onGo,
  onNotice,
}: {
  attempt: Attempt;
  busy: boolean;
  pending: boolean;
  failed: boolean;
  repo: string;
  repoError: string;
  repoTouched: boolean;
  onRepoChange: (value: string) => void;
  onRepoError: (error: string) => void;
  onRepoTouchedChange: (touched: boolean) => void;
  onAssess: (path: string, data?: unknown) => Promise<void>;
  onGo: Navigate;
  onNotice: (notice: string) => void;
}) {
  const repoInput = useRef<HTMLInputElement>(null);
  return (
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
              onRepoTouchedChange(true);
              onRepoError(message);
              if (message) {
                repoInput.current?.focus();
                return;
              }
              void onAssess(`/attempts/${attempt.id}/submission`, {
                repo,
              });
            }}
          >
            <h2 className="icon-heading">
              <Icon name="file" />
              작업물 제출
            </h2>
            <p>
              지정 브랜치에서 작업한 뒤 공개 GitHub 저장소 주소를 제출하세요.
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
                    .then(() => onNotice("브랜치명을 복사했습니다."))
                    .catch(() => onNotice("브랜치명을 선택해 복사해 주세요."));
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
                onRepoChange(e.target.value);
                if (repoTouched)
                  onRepoError(validateRepository(e.target.value));
              }}
              onBlur={() => {
                onRepoTouchedChange(true);
                onRepoError(validateRepository(repo));
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
              지정 브랜치에 작업물을 push하세요. 평가 시작 시 파일을 읽으며 대화
              중 변경 내용은 반영하지 않습니다.
            </p>
            {attempt.files.length > 0 ? (
              <button
                className="primary"
                type="button"
                onClick={() => onGo("assessment")}
              >
                대화 이어가기
              </button>
            ) : (
              <button
                className="primary"
                type="submit"
                disabled={busy || pending}
              >
                {busy || pending ? "작업물 확인 중…" : "제출하고 대화하기"}
              </button>
            )}
            {failed && (
              <div className="recovery" role="alert">
                <p>{attempt.operation?.error}</p>
                <button
                  type="button"
                  className="link-button"
                  disabled={busy}
                  onClick={() => void onAssess(`/attempts/${attempt.id}/retry`)}
                >
                  다시 시도하기
                </button>
              </div>
            )}
            <p className="notice">
              제출 기한이 없습니다. 나중에 돌아와도 이어갈 수 있습니다.
            </p>
          </form>
        </aside>
      </div>
    </>
  );
}
