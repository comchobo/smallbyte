"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { ApiError, api, type Leaderboard } from "@/lib/learning";

export function LeaderboardPanel({
  userId,
  onError,
}: {
  userId: string;
  onError: (error: unknown) => void;
}) {
  const [data, setData] = useState<Leaderboard | null>(null);
  const [error, setError] = useState(false);
  const generation = useRef(0);
  const load = useCallback(() => {
    const request = ++generation.current;
    setError(false);
    setData(null);
    api<Leaderboard>("/leaderboard")
      .then((result) => {
        if (request === generation.current) setData(result);
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

  return (
    <div className="leaderboard">
      <header className="page-title">
        <div>
          <h1>리더보드</h1>
          <p className="leaderboard-description muted">
            최근 7일, 가장 활발하게 학습한 사용자를 만나보세요.
          </p>
        </div>
      </header>
      <p className="leaderboard-guide">
        과제 시작·제출·대화·평가 완료를 각 1회로 합산합니다.
      </p>
      {error ? (
        <div className="empty" role="alert">
          <h2>리더보드를 불러오지 못했습니다.</h2>
          <p>연결 상태를 확인한 뒤 다시 불러와 주세요.</p>
          <button className="secondary" type="button" onClick={load}>
            다시 불러오기
          </button>
        </div>
      ) : !data ? (
        <p className="notice" role="status">
          리더보드를 불러오는 중…
        </p>
      ) : (
        <>
          <div className="leaderboard-period">
            <h2>최근 7일 활동 순위</h2>
            <p>
              <time dateTime={data.start}>{data.start}</time> ~{" "}
              <time dateTime={data.today}>{data.today}</time> · 한국 시간
            </p>
          </div>
          {data.items.length ? (
            <table className="leaderboard-table">
              <caption className="sr-only">최근 7일 학습 활동 순위</caption>
              <thead>
                <tr>
                  <th scope="col">순위</th>
                  <th scope="col">사용자</th>
                  <th scope="col">활동 횟수</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} data-self={item.id === userId || undefined}>
                    <td className="leaderboard-rank">{item.rank}위</td>
                    <th scope="row">
                      <div className="leaderboard-user">
                        <Avatar seed={item.id} />
                        <div className="leaderboard-identity">
                          <div>
                            <strong>{item.name}</strong>
                            {item.id === userId && (
                              <span className="leaderboard-self">나</span>
                            )}
                          </div>
                          <span className="muted">@{item.handle}</span>
                        </div>
                      </div>
                    </th>
                    <td className="leaderboard-count">
                      <strong>{item.count.toLocaleString("ko-KR")}</strong>회
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">
              <h2>최근 7일간 기록된 활동이 없습니다.</h2>
              <p>첫 과제를 시작하고 이번 주 리더보드에 이름을 올려보세요.</p>
              <Link className="primary" href="/home">
                과제 살펴보기
              </Link>
            </div>
          )}
          <p className="leaderboard-guide">
            상위 50명과 경계의 동점자를 표시합니다. 활동 횟수가 같으면 공동
            순위이며, GitHub 아이디순으로 표시됩니다.
          </p>
        </>
      )}
    </div>
  );
}
