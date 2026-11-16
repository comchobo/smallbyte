"use client";

import type { RefObject } from "react";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";

export function LoginDialog({
  dialogRef,
  onClose,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  onClose: () => void;
}) {
  return (
    <dialog
      className="login-dialog"
      ref={dialogRef}
      aria-labelledby="login-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="login-dialog-body">
        <h2 id="login-dialog-title" aria-label="smallbyte에 로그인">
          <Logo />
        </h2>
        <div className="login-connection" aria-hidden="true">
          <span className="login-provider-brand">
            <Logo />
          </span>
          <i />
          <span>
            <Icon name="github" />
          </span>
        </div>
        <p className="login-prompt">GitHub 계정으로 시작하세요.</p>
        <a className="primary" href="/api/auth/github">
          <Icon name="github" />
          GitHub로 로그인
        </a>
        <button
          className="login-dialog-close"
          type="button"
          aria-label="로그인 창 닫기"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
    </dialog>
  );
}
