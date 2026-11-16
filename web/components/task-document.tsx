import type { Task } from "@/lib/learning";

export function Meta({ task }: { task: Task }) {
  return (
    <div className="meta">
      <span>{task.area}</span>
      <span>형식·언어 자유</span>
      <span>예상 {task.minutes}분</span>
    </div>
  );
}

export function TaskDocument({ task }: { task: Task }) {
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
