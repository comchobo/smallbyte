"use client";

import Link from "next/link";
import { ConceptDiagram } from "@/components/concept-diagram";
import { Icon } from "@/components/icons";
import type { CourseMapRenderer, Navigate } from "@/components/learning/types";
import { Meta } from "@/components/task-document";
import {
  type Dashboard,
  preferenceKeys,
  preferenceLabel,
  preferenceLabels,
  type Task,
  type User,
} from "@/lib/learning";
import { pageHref } from "@/lib/routes";

export function HomeScreen({
  tasks,
  dashboard,
  user,
  featured,
  nextTask,
  map,
  onResume,
  onGo,
}: {
  tasks: Task[];
  dashboard: Dashboard;
  user: User | null;
  featured: Task;
  nextTask: Task | undefined;
  map: CourseMapRenderer;
  onResume: () => void;
  onGo: Navigate;
}) {
  return (
    <>
      <header className="page-title">
        <div>
          <h1 className="home-title">나의 학습</h1>
        </div>
      </header>
      {dashboard.passed.length === tasks.length && !dashboard.active && (
        <section className="all-complete">
          <h2>모든 과제를 완료했습니다.</h2>
          <p>기록에서 피드백을 다시 보거나 과제를 다시 수행할 수 있습니다.</p>
          <Link className="link-button" href="/history">
            학습 기록 보기
          </Link>
        </section>
      )}
      <div className="learning-grid">
        <div>
          {map()}
          {(dashboard.active || dashboard.passed.length < tasks.length) && (
            <article className="feature">
              <div className="feature-body">
                <div className="feature-head">
                  <h2>{featured.title}</h2>
                  <span className="tag">
                    {dashboard.active ? "진행 중" : "다음으로 배울 과제"}
                  </span>
                </div>
                <Meta task={featured} />
                <p className="feature-description">{featured.description}</p>
                <ConceptDiagram taskId={featured.id} compact />
                <p className="feature-reason">{dashboard.reason}</p>
              </div>
              <div className="feature-bottom">
                <button
                  className="primary"
                  type="button"
                  onClick={() =>
                    dashboard.active ? onResume() : onGo("preview", featured.id)
                  }
                >
                  {dashboard.active ? "이어서 학습하기" : "과제 살펴보기"}
                </button>
              </div>
            </article>
          )}
        </div>
        <aside className="profile-summary">
          <h2 className="icon-heading">
            <Icon name="activity" />
            학습 현황
          </h2>
          <p className="summary-owner">{user?.name}님의 코스</p>
          <div className="summary-progress">
            <p>
              <strong>{dashboard.passed.length}</strong> / {tasks.length}개 과제
              완료
            </p>
            <progress
              aria-label="코스 완료 과제 수"
              value={dashboard.passed.length}
              max={tasks.length}
            />
          </div>
          <dl className="summary-next">
            <div>
              <dt>
                {dashboard.active
                  ? "이어서 학습할 과제"
                  : dashboard.passed.length === tasks.length
                    ? "코스 완료"
                    : "지금 시작할 과제"}
              </dt>
              <dd>
                {dashboard.active || dashboard.passed.length < tasks.length ? (
                  <Link
                    href={
                      dashboard.active
                        ? pageHref(
                            dashboard.active.status === "chatting"
                              ? "assessment"
                              : "task",
                          )
                        : pageHref("preview", featured.id)
                    }
                  >
                    {featured.concept}
                    <span aria-hidden="true"> →</span>
                  </Link>
                ) : (
                  <Link href="/history">학습 기록 보기 →</Link>
                )}
              </dd>
            </div>
            {nextTask && (
              <div>
                <dt>그다음 과제</dt>
                <dd>
                  <Link href={pageHref("preview", nextTask.id)}>
                    {nextTask.concept}
                  </Link>
                </dd>
              </div>
            )}
          </dl>
          <section className="summary-preferences">
            <h3 className="icon-heading">
              <Icon name="settings" />
              나의 학습 설정
            </h3>
            <dl>
              {preferenceKeys.map((key) => (
                <div key={key}>
                  <dt>{preferenceLabels[key]}</dt>
                  <dd>{preferenceLabel(key, user?.[key] || "")}</dd>
                </div>
              ))}
            </dl>
          </section>
          <Link className="link-button" href="/mypage">
            학습 방향 바꾸기
          </Link>
        </aside>
      </div>
    </>
  );
}
