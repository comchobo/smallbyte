"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { type Activity, ApiError, api } from "@/lib/learning";

export function ActivityPanel({
  onError,
}: {
  onError: (error: unknown) => void;
}) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [error, setError] = useState(false);
  const generation = useRef(0);
  const load = useCallback(() => {
    const request = ++generation.current;
    setError(false);
    setActivity(null);
    api<Activity>("/activity")
      .then((data) => {
        if (request === generation.current) setActivity(data);
      })
      .catch((cause) => {
        if (request !== generation.current) return;
        if (cause instanceof ApiError && cause.status === 401) onError(cause);
        else setError(true);
      });
  }, [onError]);
  useEffect(() => {
    load();
    return () => {
      generation.current += 1;
    };
  }, [load]);
  const days = activity?.days.filter((day) => day.date <= activity.today) || [];
  const total = days.reduce((count, day) => count + day.count, 0);
  return (
    <section className="activity" aria-label="학습 활동">
      <div className="activity-heading">
        <h2 className="icon-heading">
          <Icon name="activity" />
          학습 활동
        </h2>
        <span>최근 26주 · 한국 시간</span>
      </div>
      {error ? (
        <div className="activity-recovery" role="alert">
          <p>학습 활동을 불러오지 못했습니다.</p>
          <button className="link-button" type="button" onClick={load}>
            다시 불러오기
          </button>
        </div>
      ) : !activity ? (
        <p className="notice" role="status">
          학습 활동을 불러오는 중…
        </p>
      ) : (
        <>
          <div className="activity-overview">
            <p>
              <strong>{days.filter((day) => day.count > 0).length}일</strong>{" "}
              활동했어요
            </p>
            <p>
              활동 기록 <strong>{total}회</strong>
            </p>
          </div>
          <div className="activity-calendar">
            <div
              className="heatmap"
              role="img"
              aria-label={`최근 26주 학습 활동. ${days.filter((day) => day.count > 0).length}일 활동, 총 ${total}회. 색이 짙을수록 활동이 많습니다.`}
            >
              {activity.days.map((day) => (
                <span
                  key={day.date}
                  className={`heat-cell ${day.date > activity.today ? "future" : ""}`}
                  data-level={Math.min(3, day.count)}
                  title={`${day.date} · 활동 ${day.count}회`}
                />
              ))}
            </div>
            <div className="heat-labels">
              <span>{activity.start}</span>
              <span>{activity.today}</span>
            </div>
          </div>
          <div className="activity-key">
            <span>
              {total
                ? "과제 시작·제출·대화·평가 완료 기록"
                : "첫 실험을 시작하면 활동이 기록됩니다."}
            </span>
            <span className="heat-legend">
              적음 <i className="heat-cell" data-level="0" />
              <i className="heat-cell" data-level="1" />
              <i className="heat-cell" data-level="2" />
              <i className="heat-cell" data-level="3" /> 많음
            </span>
          </div>
        </>
      )}
    </section>
  );
}
