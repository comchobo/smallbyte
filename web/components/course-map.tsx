"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { Task } from "@/lib/learning";
import { pageHref } from "@/lib/routes";

const points = [
  [150, 320],
  [340, 250],
  [540, 280],
  [700, 140],
];

export function CourseMap({
  tasks,
  order,
  passed = [],
  focus,
  mini = false,
}: {
  tasks: Task[];
  order: string[];
  passed?: string[];
  focus?: string | null;
  mini?: boolean;
}) {
  const [leg, setLeg] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const pattern = useId();
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const current = Math.max(0, order.indexOf(focus || ""));
  const [fx, fy] = points[current] || points[0];
  return (
    <section
      className={mini ? "mini-map" : "course-card"}
      aria-label="학습 코스 지도"
    >
      {!mini && (
        <div className="course-head">
          <div>
            <h2>학습 코스</h2>
          </div>
          <div className="seg">
            <button
              type="button"
              aria-pressed={!leg}
              onClick={() => setLeg(false)}
            >
              전체 코스
            </button>
            <button
              type="button"
              aria-pressed={leg}
              onClick={() => setLeg(true)}
            >
              현재 구간
            </button>
          </div>
          <div className="map-legend">
            <span>
              <i className="terrain-key" />
              개념 영역
            </span>
            <span>
              <i className="route-key" />
              학습 코스
            </span>
            <span>
              <i className="route-key thick" />
              현재 구간
            </span>
            <span>
              <i className="done-key" />
              완료
            </span>
          </div>
        </div>
      )}
      <div className="course-map">
        <svg
          viewBox="0 0 860 420"
          aria-label={`학습 코스. ${passed.length}개 완료. ${order.map((id) => byId.get(id)?.concept).join(", ")}`}
        >
          <title>웹 CS 학습 코스</title>
          <rect width="860" height="420" fill="#fff" />
          <g
            className="map-content"
            style={{
              transform:
                leg && !mini
                  ? `translate(${430 - fx * 1.72}px,${210 - fy * 1.72}px) scale(1.72)`
                  : undefined,
            }}
          >
            <defs>
              <pattern
                id={pattern}
                width="8"
                height="8"
                patternUnits="userSpaceOnUse"
              >
                <rect width="8" height="8" fill="#e4edf7" />
                <path d="M0 4h8" stroke="#7aa7d8" strokeWidth="1.2" />
              </pattern>
            </defs>
            <g>
              <path d="M0 0H300Q250 60 300 120L0 150Z" fill="#b5c48a" />
              <path d="M860 420H620Q670 360 640 300L860 270Z" fill="#b5c48a" />
              <path
                d="M560 0H860V180Q760 160 720 100Q690 40 560 60Z"
                fill="#f5e27a"
              />
              <path d="M0 300Q90 270 160 300T300 320V420H0Z" fill="#f5e27a" />
              <path
                d="M380 250Q440 220 500 250T600 240V330Q520 360 460 330T380 330Z"
                fill={`url(#${pattern})`}
              />
              <g stroke="#a06a3c" fill="none" strokeWidth="1.2">
                <path d="M40 120Q150 90 240 140T420 150" />
                <path d="M30 150Q160 120 250 170T430 180" />
                <path d="M20 180Q170 150 260 200T440 210" />
                <path d="M500 40Q610 20 710 60T860 50" />
                <path d="M480 70Q610 50 730 90T860 80" />
                <path d="M470 100Q610 80 740 120T860 110" />
                <path d="M640 250Q700 230 760 255T860 245" />
              </g>
              <g className="terrain-label">
                <text x="52" y="70">
                  네트워크
                </text>
                <text x="420" y="320">
                  HTTP
                </text>
                <text x="680" y="60">
                  브라우저
                </text>
                <text x="650" y="372">
                  상태 관리
                </text>
              </g>
              {[[70, 360], ...points, [790, 80]]
                .slice(0, -1)
                .map(([x, y], i) => {
                  const next = [...points, [790, 80]][i];
                  return (
                    <line
                      key={`${x}-${y}`}
                      x1={x}
                      y1={y}
                      x2={next[0]}
                      y2={next[1]}
                      stroke="#7b2f9e"
                      strokeWidth={i === current ? 7 : 4}
                    />
                  );
                })}
              <path d="M70 346 L86 372 L54 372 Z" fill="#7b2f9e" />
              <circle
                cx="790"
                cy="80"
                r="15"
                fill="#fff"
                stroke="#7b2f9e"
                strokeWidth="4"
              />
              <circle
                cx="790"
                cy="80"
                r="8"
                fill="none"
                stroke="#7b2f9e"
                strokeWidth="3"
              />
            </g>
            {order.map((id, i) => {
              const t = byId.get(id);
              const [x, y] = points[i];
              const done = passed.includes(id);
              return (
                <Link
                  key={id}
                  href={pageHref("preview", id)}
                  onMouseEnter={() => setHover(id)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(id)}
                  onBlur={() => setHover(null)}
                  aria-label={`${i + 1}번 ${t?.concept}, ${done ? "완료" : focus === id ? "현재 과제" : "예정"}`}
                  className="map-control"
                >
                  {focus === id && (
                    <circle
                      cx={x}
                      cy={y}
                      r="27"
                      fill="none"
                      stroke="#7b2f9e"
                      strokeWidth="1.6"
                    />
                  )}
                  <circle cx={x} cy={y} r="21" fill="#fff" />
                  <circle
                    cx={x}
                    cy={y}
                    r="15"
                    fill={done ? "#4e5f38" : hover === id ? "#f1e6f6" : "#fff"}
                    stroke={done ? "#4e5f38" : "#7b2f9e"}
                    strokeWidth={hover === id ? 6 : 3.2}
                  />
                  <text
                    x={x}
                    y={y + 4}
                    textAnchor="middle"
                    fill={done ? "white" : "#7b2f9e"}
                    className="map-number"
                  >
                    {i + 1}
                  </text>
                  {focus === id && !mini && (
                    <g>
                      <rect
                        x={x - 17}
                        y={y + 22}
                        width="34"
                        height="14"
                        rx="2"
                        fill="#7b2f9e"
                      />
                      <text
                        x={x}
                        y={y + 32}
                        textAnchor="middle"
                        className="map-now"
                      >
                        지금
                      </text>
                    </g>
                  )}
                  <text
                    x={x}
                    y={y - 30}
                    textAnchor="middle"
                    className="map-label"
                  >
                    {t?.concept}
                  </text>
                </Link>
              );
            })}
          </g>
        </svg>
      </div>
      {!mini && (
        <table className="course-table">
          <caption className="sr-only">코스별 과제와 완료 상태</caption>
          <thead>
            <tr>
              <th>#</th>
              <th>컨트롤</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {order.map((id, i) => {
              const t = byId.get(id);
              return (
                <tr key={id} className={hover === id ? "linked" : ""}>
                  <td>{i + 1}</td>
                  <td>
                    <Link
                      href={pageHref("preview", id)}
                      onMouseEnter={() => setHover(id)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(id)}
                      onBlur={() => setHover(null)}
                    >
                      <strong>{t?.title}</strong>
                      <small>
                        {t?.concept} · {t?.minutes}분
                      </small>
                    </Link>
                  </td>
                  <td>
                    <span
                      className={`control-status ${passed.includes(id) ? "done" : id === focus ? "current" : ""}`}
                    >
                      {passed.includes(id)
                        ? "완료"
                        : id === focus
                          ? "현재"
                          : "예정"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
