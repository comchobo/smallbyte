"use client";

import Link from "next/link";
import type { CourseMapRenderer } from "@/components/learning/types";
import { TaskDocument } from "@/components/task-document";
import type { Dashboard, Task } from "@/lib/learning";

export function PreviewScreen({
  selected,
  dashboard,
  busy,
  map,
  onBegin,
  onResume,
}: {
  selected: Task | undefined;
  dashboard: Dashboard | null;
  busy: boolean;
  map: CourseMapRenderer;
  onBegin: (id: string) => void;
  onResume: () => void;
}) {
  if (!selected) {
    return (
      <div className="empty">
        <h1>과제를 찾을 수 없습니다.</h1>
        <Link href="/home">학습 홈으로</Link>
      </div>
    );
  }
  return (
    <>
      <Link className="link-button back" href="/home">
        학습으로 돌아가기
      </Link>
      <div className="task-layout">
        <TaskDocument task={selected} />
        <aside className="preview-side">
          <h2>{dashboard?.active ? "과제 미리보기" : "이 과제 시작하기"}</h2>
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
              <button className="primary" type="button" onClick={onResume}>
                진행 중인 과제 이어하기
              </button>
            </>
          ) : (
            <button
              className="primary"
              disabled={busy}
              type="button"
              onClick={() => void onBegin(selected.id)}
            >
              {busy ? "시작 중…" : "과제 시작하기"}
            </button>
          )}
          {map(true)}
        </aside>
      </div>
    </>
  );
}
