"use client";

import { useEffect, useRef } from "react";
import type { Attempt } from "@/lib/learning";

export function Source({ attempt }: { attempt: Attempt }) {
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

export function Transcript({ attempt }: { attempt: Attempt }) {
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
