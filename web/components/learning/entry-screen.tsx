"use client";

import Link from "next/link";
import { CourseMap } from "@/components/course-map";
import { Icon } from "@/components/icons";
import { LandingSections } from "@/components/landing-sections";
import type { Task, User } from "@/lib/learning";

export function EntryScreen({
  tasks,
  user,
  entryHref,
  entryLabel,
}: {
  tasks: Task[];
  user: User | null;
  entryHref: string;
  entryLabel: string;
}) {
  return (
    <>
      <div className="entry">
        <section className="entry-copy">
          <h1>
            개념을 지형으로,
            <br />
            <em>배움을 코스로.</em>
          </h1>
          <p>
            CS와 웹의 원리를 작은 실험으로 익힙니다. 나에게 맞는 코스를
            따라가고, 작업물에 대한 대화로 이해를 확인하세요.
          </p>
          <Link className="primary" href={entryHref}>
            {user ? <Icon name="arrow" /> : <Icon name="github" />}
            {entryLabel}
          </Link>
        </section>
        <section className="entry-example" aria-label="학습 코스 예시">
          <div className="example-head">
            <span>예시 코스 · 4개 과제</span>
          </div>
          <CourseMap
            tasks={tasks}
            order={["dns", "http", "cache", "session"]}
            focus="cache"
            mini
            requiresLogin={!user}
          />
          <div className="example-body">
            <h2>{tasks.find((t) => t.id === "cache")?.title}</h2>
            <p>{tasks.find((t) => t.id === "cache")?.description}</p>
            <div className="example-code">
              <pre>
                GET /message HTTP/1.1{"\n"}If-None-Match: "version-1"
                {"\n\n"}HTTP/1.1 304 Not Modified
              </pre>
            </div>
          </div>
        </section>
      </div>
      <LandingSections
        tasks={tasks}
        startHref={entryHref}
        startLabel={entryLabel}
        signedIn={!!user}
      />
    </>
  );
}
