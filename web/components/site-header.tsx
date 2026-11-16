"use client";

import Link from "next/link";
import { AccountMenu } from "@/components/learning/account-menu";
import { Logo } from "@/components/logo";
import type { User } from "@/lib/learning";
import type { Page } from "@/lib/routes";

export type HeaderPage = Page | "privacy" | "terms";

const learningPages: HeaderPage[] = ["home", "preview", "task", "assessment"];
const historyPages: HeaderPage[] = ["history", "result"];

export function SiteHeader({
  page,
  user,
  ready,
  busy,
  onLogout,
}: {
  page: HeaderPage;
  user: User | null;
  ready: boolean;
  busy: boolean;
  onLogout: () => void;
}) {
  return (
    <header className="header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="smallbyte 홈">
          <Logo />
        </Link>
        {ready && (
          <nav className="nav" aria-label="주요 메뉴">
            <Link
              href="/home"
              aria-current={learningPages.includes(page) ? "page" : undefined}
            >
              학습
            </Link>
            <Link
              href="/history"
              aria-current={historyPages.includes(page) ? "page" : undefined}
            >
              기록
            </Link>
            <Link
              href="/leaderboard"
              aria-current={page === "leaderboard" ? "page" : undefined}
            >
              리더보드
            </Link>
          </nav>
        )}
        <div className="header-right">
          {user ? (
            <AccountMenu user={user} busy={busy} onLogout={onLogout} />
          ) : page !== "login" ? (
            <Link href="/login">로그인</Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
