"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import type { Task } from "@/lib/learning";
import { pageHref } from "@/lib/routes";

export function CourseMap({
  tasks,
  order,
  passed = [],
  focus,
  mini = false,
  requiresLogin = false,
}: {
  tasks: Task[];
  order: string[];
  passed?: string[];
  focus?: string | null;
  mini?: boolean;
  requiresLogin?: boolean;
}) {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const course = order.flatMap((id) => {
    const task = byId.get(id);
    return task ? [task] : [];
  });
  return (
    <section
      className={mini ? "course-path compact" : "course-path"}
      aria-label="학습 코스"
    >
      <div className="course-path-heading">
        <h2 className="icon-heading">
          <Icon name="route" />
          {mini ? "코스 순서" : "나의 학습 경로"}
        </h2>
        {!mini && <p>순서대로 배우거나, 궁금한 과제를 먼저 살펴보세요.</p>}
      </div>
      <ol className="course-stops">
        {course.map((task, index) => {
          const done = passed.includes(task.id);
          const current = focus === task.id;
          const status = current
            ? done
              ? "복습 중"
              : "현재 과제"
            : done
              ? "완료"
              : "예정";
          return (
            <li
              key={task.id}
              className={current ? "is-current" : done ? "is-done" : ""}
            >
              <Link
                href={
                  requiresLogin
                    ? pageHref("login")
                    : pageHref("preview", task.id)
                }
                aria-current={current ? "step" : undefined}
              >
                <span className="course-stop-number" aria-hidden="true">
                  {done && !current ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="m6 12 4 4 8-8" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="course-stop-copy">
                  <strong>{task.concept}</strong>
                  <span className="course-stop-status">
                    {status} · {task.minutes}분
                  </span>
                  {!mini && (
                    <span className="course-stop-title">{task.title}</span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
