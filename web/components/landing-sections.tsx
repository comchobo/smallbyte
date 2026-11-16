"use client";

import Link from "next/link";
import { useState } from "react";
import { ConceptDiagram } from "@/components/concept-diagram";
import { Icon, type IconName, taskIcon } from "@/components/icons";
import type { Task } from "@/lib/learning";
import { pageHref } from "@/lib/routes";

const workflow: { title: string; description: string; icon: IconName }[] = [
  {
    title: "코스 고르기",
    description: "목적과 경험에 맞는 과제부터 시작합니다.",
    icon: "route",
  },
  {
    title: "로컬에서 실험하기",
    description: "요청을 보내고, 조건을 바꾸고, 결과를 비교합니다.",
    icon: "code",
  },
  {
    title: "작업물 제출하기",
    description: "공개 GitHub 저장소의 지정 브랜치를 연결합니다.",
    icon: "file",
  },
  {
    title: "대화로 확인하기",
    description: "작업물을 근거로 설명하고 피드백을 받습니다.",
    icon: "message",
  },
];

export function LandingSections({
  tasks,
  startHref,
  startLabel,
  signedIn,
}: {
  tasks: Task[];
  startHref: string;
  startLabel: string;
  signedIn: boolean;
}) {
  const [topic, setTopic] = useState("http");
  const selected = tasks.find((task) => task.id === topic);
  return (
    <div className="landing-sections">
      <section
        className="landing-section"
        aria-labelledby="learning-workflow-title"
      >
        <header className="landing-section-heading">
          <h2 id="learning-workflow-title">
            작은 실험 하나가 학습이 되는 과정
          </h2>
          <p>
            실행은 내 컴퓨터에서, 이해 확인은 작업물에 대한 대화로 진행합니다.
          </p>
        </header>
        <ol className="learning-workflow">
          {workflow.map((step) => (
            <li key={step.title}>
              <span className="workflow-symbol">
                <Icon name={step.icon} />
              </span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>
      <section
        className="landing-section"
        aria-labelledby="learning-topics-title"
      >
        <header className="landing-section-heading">
          <h2 id="learning-topics-title">웹에서 매일 만나는 네 가지 원리</h2>
          <p>주제를 선택해 어떤 흐름을 실험하는지 살펴보세요.</p>
        </header>
        <div className="landing-topic-layout">
          <fieldset className="topic-switch" aria-label="실험 주제 선택">
            {["http", "cache", "dns", "session"].map((id) => {
              const task = tasks.find((item) => item.id === id);
              return (
                task && (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={topic === id}
                    onClick={() => setTopic(id)}
                  >
                    <Icon name={taskIcon(id)} />
                    <span>
                      <strong>{task.concept}</strong>
                      <small>{task.title}</small>
                    </span>
                    <Icon name="arrow" />
                  </button>
                )
              );
            })}
          </fieldset>
          <div className="topic-preview" aria-live="polite">
            <ConceptDiagram taskId={topic} />
            {selected && <p>{selected.description}</p>}
            <Link
              className="link-button"
              href={signedIn ? pageHref("preview", topic) : "/login"}
            >
              이 과제 살펴보기 <Icon name="arrow" />
            </Link>
          </div>
        </div>
      </section>
      <section
        className="landing-section landing-faq"
        aria-labelledby="learning-faq-title"
      >
        <header className="landing-section-heading">
          <h2 id="learning-faq-title">시작하기 전에</h2>
        </header>
        <div>
          <details>
            <summary>
              어떤 언어와 도구를 사용하나요?
              <Icon name="chevron" />
            </summary>
            <p>
              언어와 파일 형식은 자유입니다. 과제에 따라 표준 라이브러리와 curl
              같은 도구로 시작할 수 있습니다.
            </p>
          </details>
          <details>
            <summary>
              반드시 서버를 직접 구현해야 하나요?
              <Icon name="chevron" />
            </summary>
            <p>
              과제에 따라 소스·설정으로 동작을 보여주거나 실제 관찰 자료로
              설명할 수 있습니다. 각 과제의 완료 기준에서 범위를 확인하세요.
            </p>
          </details>
          <details>
            <summary>
              제출한 코드를 실행해서 평가하나요?
              <Icon name="chevron" />
            </summary>
            <p>
              코드를 실행하지 않습니다. 제출된 텍스트 파일을 읽고, 필요한 경우
              최대 10회의 질문과 답변으로 이해를 확인합니다.
            </p>
          </details>
          <details>
            <summary>
              비공개 저장소도 제출할 수 있나요?
              <Icon name="chevron" />
            </summary>
            <p>
              현재는 공개 GitHub 저장소만 지원합니다. 저장소 쓰기 권한은
              요청하지 않습니다.
            </p>
          </details>
        </div>
      </section>
      <section className="landing-start">
        <div>
          <h2>첫 실험을 골라보세요.</h2>
          <p>진행한 과제와 피드백은 계정에 보관됩니다.</p>
        </div>
        <Link className="primary" href={startHref}>
          {startLabel}
          <Icon name="arrow" />
        </Link>
      </section>
    </div>
  );
}
