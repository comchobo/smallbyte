"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import type { User } from "@/lib/learning";

export function AccountMenu({
  user,
  busy,
  onLogout,
}: {
  user: User;
  busy: boolean;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLFieldSetElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !container.current?.contains(event.target)
      )
        setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        trigger.current?.focus();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);
  return (
    <fieldset
      className="account-menu"
      aria-label="계정"
      ref={container}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (
          event.pointerType === "mouse" &&
          !container.current?.contains(document.activeElement)
        )
          setOpen(false);
      }}
      onFocus={(event) => {
        if (event.target.matches(":focus-visible")) setOpen(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        className="avatar-link"
        type="button"
        ref={trigger}
        aria-label={`${user.name}님의 계정 메뉴`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar seed={user.id} />
      </button>
      <div className="account-popover" id={id} hidden={!open}>
        <div className="account-identity">
          <strong>{user.name}</strong>
          <span>@{user.handle}</span>
        </div>
        <nav aria-label="계정 메뉴">
          <Link href="/mypage" onClick={() => setOpen(false)}>
            마이페이지
          </Link>
          <button type="button" disabled={busy} onClick={onLogout}>
            {busy ? "처리 중…" : "로그아웃"}
          </button>
        </nav>
      </div>
    </fieldset>
  );
}
