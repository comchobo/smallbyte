import Link from "next/link";
import type { ReactNode } from "react";
import {
  POLICY_CONTACT,
  POLICY_EFFECTIVE_DATE,
  POLICY_EFFECTIVE_DATE_ISO,
  POLICY_OPERATOR,
} from "@/lib/policy";

export type PolicySection = { id: string; title: string };

export function PolicyDocument({
  title,
  summary,
  sections,
  children,
}: {
  title: string;
  summary: string;
  sections: PolicySection[];
  children: ReactNode;
}) {
  return (
    <main className="page policy-page" id="main">
      <header className="policy-head">
        <p className="policy-eyebrow">smallbyte 정책</p>
        <h1>{title}</h1>
        <p className="policy-summary">{summary}</p>
        <dl className="policy-meta">
          <div>
            <dt>시행일</dt>
            <dd>
              <time dateTime={POLICY_EFFECTIVE_DATE_ISO}>
                {POLICY_EFFECTIVE_DATE}
              </time>
            </dd>
          </div>
          <div>
            <dt>운영자</dt>
            <dd>{POLICY_OPERATOR}</dd>
          </div>
          <div>
            <dt>문의</dt>
            <dd>
              <a href={`mailto:${POLICY_CONTACT}`}>{POLICY_CONTACT}</a>
            </dd>
          </div>
        </dl>
        <Link className="policy-back" href="/">
          홈으로 돌아가기
        </Link>
      </header>
      <div className="policy-layout">
        <nav className="policy-toc" aria-label="목차">
          <h2>목차</h2>
          <ol>
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="policy-body">{children}</article>
      </div>
    </main>
  );
}
