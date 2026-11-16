"use client";

import Link from "next/link";
import { ActivityPanel } from "@/components/activity-panel";
import { dateLabel, type History } from "@/lib/learning";
import { pageHref } from "@/lib/routes";

export function HistoryScreen({
  records,
  query,
  filter,
  historyPage,
  onQueryChange,
  onFilterChange,
  onPageChange,
  onError,
}: {
  records: History | null;
  query: string;
  filter: string;
  historyPage: number;
  onQueryChange: (query: string) => void;
  onFilterChange: (filter: string) => void;
  onPageChange: (page: number) => void;
  onError: (error: unknown) => void;
}) {
  return (
    <>
      <header className="page-title">
        <div>
          <h1>학습 기록</h1>
        </div>
      </header>
      <div className="history-grid">
        <div>
          <ActivityPanel onError={onError} />
          <div className="section-head">
            <h2>완료한 평가</h2>
            <span>{records?.total || 0}건</span>
          </div>
          <div className="history-filters">
            <label>
              과제명 검색
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  onQueryChange(e.target.value);
                  onPageChange(1);
                }}
                maxLength={100}
                placeholder="과제명으로 검색"
              />
            </label>
            <label>
              결과
              <select
                value={filter}
                onChange={(e) => {
                  onFilterChange(e.target.value);
                  onPageChange(1);
                }}
              >
                <option value="">전체</option>
                <option value="pass">PASS</option>
                <option value="fail">FAIL</option>
              </select>
            </label>
          </div>
          {records ? (
            records.items.length ? (
              <div className="history-list">
                {records.items.map((r) => (
                  <Link
                    className="history-row"
                    href={pageHref("result", "", r.id)}
                    key={r.id}
                  >
                    <span>
                      <strong>{r.title}</strong>
                      <small>{r.concept}</small>
                    </span>
                    <time dateTime={r.completed_at}>
                      {dateLabel(r.completed_at)}
                    </time>
                    <span
                      className={`outcome ${r.outcome === "fail" ? "fail" : ""}`}
                    >
                      {r.outcome.toUpperCase()}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty">
                <h3>
                  {query || filter
                    ? "조건에 맞는 기록이 없습니다."
                    : "아직 완료한 평가가 없습니다."}
                </h3>
                <p>
                  {query || filter
                    ? "검색어나 결과 필터를 바꾸어 보세요."
                    : "첫 과제를 마치면 대화와 피드백이 이곳에 저장됩니다."}
                </p>
                {query || filter ? (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      onQueryChange("");
                      onFilterChange("");
                      onPageChange(1);
                    }}
                  >
                    필터 초기화
                  </button>
                ) : (
                  <Link className="primary" href="/home">
                    과제 살펴보기
                  </Link>
                )}
              </div>
            )
          ) : (
            <p role="status">기록을 불러오는 중…</p>
          )}
          {records && records.total > 20 && (
            <div className="actions">
              <button
                type="button"
                className="secondary"
                disabled={historyPage <= 1}
                onClick={() => onPageChange(historyPage - 1)}
              >
                이전
              </button>
              <span>
                {historyPage} / {Math.ceil(records.total / 20)}
              </span>
              <button
                type="button"
                className="secondary"
                disabled={historyPage * 20 >= records.total}
                onClick={() => onPageChange(historyPage + 1)}
              >
                다음
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
