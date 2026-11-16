"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { api, type User } from "@/lib/learning";

export function PolicyShell({
  page,
  initialUser,
  children,
}: {
  page: "privacy" | "terms";
  initialUser: User | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser);
  const [busy, setBusy] = useState(false);

  const logout = useCallback(async () => {
    setBusy(true);
    try {
      await api<void>("/auth/logout", "POST");
    } finally {
      setUser(null);
      setBusy(false);
      router.replace("/");
    }
  }, [router]);

  return (
    <>
      <button
        className="skip"
        type="button"
        onClick={() => {
          document.getElementById("main")?.focus();
        }}
      >
        본문으로 이동
      </button>
      <SiteHeader
        page={page}
        user={user}
        ready={Boolean(user?.onboarding_complete)}
        busy={busy}
        onLogout={() => void logout()}
      />
      {children}
    </>
  );
}
