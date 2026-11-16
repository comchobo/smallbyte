"use client";

import Link from "next/link";
import { ActivityPanel } from "@/components/activity-panel";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icons";
import {
  choices,
  type Dashboard,
  preferenceKeys,
  preferenceLabels,
  type Task,
  type User,
} from "@/lib/learning";

export function ProfileScreen({
  user,
  tasks,
  dashboard,
  busy,
  onSaveProfile,
  onLogout,
  onError,
}: {
  user: User;
  tasks: Task[];
  dashboard: Dashboard | null;
  busy: boolean;
  onSaveProfile: (data: unknown) => void | Promise<void>;
  onLogout: () => void;
  onError: (error: unknown) => void;
}) {
  return (
    <>
      <header className="page-title">
        <div>
          <h1>마이페이지</h1>
        </div>
      </header>
      <div className="profile-layout">
        <aside className="profile-account">
          <span className="identity-avatar">
            <Avatar seed={user.id} />
          </span>
          <h2>{user.name}</h2>
          <p>@{user.handle} · GitHub 계정</p>
          <div className="course-progress">
            <progress
              aria-label="코스 완료 과제 수"
              value={dashboard?.passed.length || 0}
              max={tasks.length}
            />
            <p>
              {dashboard?.passed.length || 0} / {tasks.length} 과제 완료
            </p>
          </div>
          <Link href="/history" className="link-button">
            나의 학습 기록 보기
          </Link>
        </aside>
        <div className="profile-main">
          <ActivityPanel onError={onError} />
          <div className="profile-sections">
            <section className="profile-section">
              <h2 className="icon-heading">
                <Icon name="user" />
                계정 정보
              </h2>
              <form
                className="profile-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void onSaveProfile({
                    name: new FormData(e.currentTarget).get("name"),
                  });
                }}
              >
                <label htmlFor="display-name">
                  표시 이름
                  <input
                    key={user.name}
                    id="display-name"
                    name="name"
                    defaultValue={user.name}
                    required
                    maxLength={30}
                    autoComplete="nickname"
                  />
                </label>
                <button className="primary" disabled={busy} type="submit">
                  이름 저장
                </button>
              </form>
            </section>
            <section className="profile-section">
              <h2 className="icon-heading">
                <Icon name="settings" />
                학습 방향
              </h2>
              <p>추천에 반영합니다. 진행 중인 과제는 그대로 유지됩니다.</p>
              <form
                className="profile-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  void onSaveProfile(Object.fromEntries(form));
                }}
              >
                {preferenceKeys.map((key) => (
                  <label key={key} htmlFor={`profile-${key}`}>
                    {preferenceLabels[key]}
                    <select
                      key={user[key]}
                      id={`profile-${key}`}
                      name={key}
                      defaultValue={user[key]}
                    >
                      {choices[key].map(([value, title]) => (
                        <option key={value} value={value}>
                          {title}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <button className="primary" disabled={busy} type="submit">
                  학습 방향 저장
                </button>
              </form>
            </section>
            <section className="profile-section">
              <h2 className="icon-heading">
                <Icon name="link" />
                기본 제출 저장소
              </h2>
              <p>
                새 과제를 시작할 때 자동 입력됩니다. 과제마다 다른 주소를 제출할
                수도 있습니다.
              </p>
              <form
                className="profile-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void onSaveProfile({
                    default_repo: new FormData(e.currentTarget).get("repo"),
                  });
                }}
              >
                <label htmlFor="default-repo">
                  공개 GitHub 저장소 URL
                  <input
                    key={user.default_repo}
                    id="default-repo"
                    type="url"
                    name="repo"
                    maxLength={300}
                    defaultValue={user.default_repo}
                    placeholder="https://github.com/name/cs-lab"
                  />
                </label>
                <p className="notice">
                  비워서 저장하면 기본 저장소를 해제합니다.
                </p>
                <button className="primary" disabled={busy} type="submit">
                  기본 저장소 저장
                </button>
              </form>
            </section>
            <section className="profile-section">
              <h2>로그아웃</h2>
              <p>학습 기록은 계정에 보관됩니다.</p>
              <button
                className="secondary"
                disabled={busy}
                type="button"
                onClick={onLogout}
              >
                로그아웃
              </button>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
