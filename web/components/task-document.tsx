import { useId } from "react";
import { ConceptDiagram } from "@/components/concept-diagram";
import { Icon } from "@/components/icons";
import { TaskHints } from "@/components/task-hints";
import type { Task } from "@/lib/learning";

export function Meta({ task }: { task: Task }) {
  return (
    <div className="meta">
      <span>{task.area}</span>
      <span>
        <Icon name="code" />
        형식·언어 자유
      </span>
      <span>
        <Icon name="clock" />
        예상 {task.minutes}분
      </span>
    </div>
  );
}

function TaskStarter({ text }: { text: string }) {
  return text.split(/```[^\n]*\n([\s\S]*?)```/g).map((part, index) =>
    !part.trim() ? null : index % 2 ? (
      <div className="code-panel" key={part}>
        <pre>
          <code>{part.trimEnd()}</code>
        </pre>
      </div>
    ) : (
      <p className="starter-note" key={part}>
        {part.trim()}
      </p>
    ),
  );
}

export function TaskDocument({ task }: { task: Task }) {
  const id = useId();
  return (
    <article className="task-document">
      <header className="task-intro">
        <h1>{task.title}</h1>
        <Meta task={task} />
        <p className="task-problem">{task.problem}</p>
      </header>
      <ConceptDiagram taskId={task.id} />
      <nav className="task-contents" aria-label="과제 목차">
        <a href={`#${id}-steps`}>실험 순서</a>
        <a href={`#${id}-criteria`}>완료 기준</a>
        <a href={`#${id}-submit`}>제출 방법</a>
        <a href={`#${id}-help`}>참고 자료</a>
      </nav>
      <section className="document-section" id={`${id}-steps`}>
        <h2>실험 순서</h2>
        <ol className="experiment-steps">
          {task.steps.map((step) => {
            const separator = task.version >= 3 ? step.indexOf(". ") : -1;
            return (
              <li key={step}>
                {separator < 0 ? (
                  step
                ) : (
                  <div>
                    <h3>{step.slice(0, separator)}</h3>
                    <p>{step.slice(separator + 2)}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>
      <section className="document-section" id={`${id}-criteria`}>
        <h2>완료 기준</h2>
        <p>아래 동작을 코드나 관찰 결과에 연결해 설명할 수 있으면 됩니다.</p>
        <ul className="completion-criteria">
          {task.requirements.map((requirement) => (
            <li key={requirement}>
              <span className="document-marker" aria-hidden="true">
                <Icon name="check" />
              </span>
              <p>{requirement}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="document-section" id={`${id}-submit`}>
        <h2>제출 방법</h2>
        <p>{task.submission_guidance}</p>
        <dl className="submission-facts">
          <div>
            <dt>공개 GitHub 저장소의 브랜치</dt>
            <dd>
              <code>{task.branch}</code>
            </dd>
          </div>
          <div>
            <dt>읽을 수 있는 파일</dt>
            <dd>텍스트 파일 합계 200KB 이내 · 언어·형식 자유</dd>
          </div>
          <div>
            <dt>평가 방식</dt>
            <dd>제출 파일을 읽고 최대 10회 대화 · 코드 실행 없음</dd>
          </div>
        </dl>
      </section>
      <section className="document-section task-resources" id={`${id}-help`}>
        <h2>참고 자료</h2>
        <details className="read-task">
          <summary>시작 코드와 명령 예시</summary>
          <TaskStarter text={task.starter} />
        </details>
        <details className="read-task">
          <summary>막혔을 때 확인할 힌트</summary>
          <TaskHints task={task} />
        </details>
        <details className="read-task">
          <summary>대화에서 확인할 개념</summary>
          <ul className="concept-reference">
            {task.rubric.map((item) => (
              <li key={item.id}>{item.title}</li>
            ))}
          </ul>
        </details>
      </section>
    </article>
  );
}
