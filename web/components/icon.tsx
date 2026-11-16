import type { ReactNode } from "react";

const paths = {
  chevron: <path d="m6 9 6 6 6-6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  route: (
    <>
      <circle cx="5" cy="5" r="2" />
      <circle cx="19" cy="19" r="2" />
      <path d="M7 5h8a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  code: (
    <>
      <path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16" />
    </>
  ),
  network: (
    <>
      <circle cx="12" cy="5" r="2" />
      <rect x="3" y="16" width="5" height="5" rx="1" />
      <rect x="16" y="16" width="5" height="5" rx="1" />
      <path d="M12 7v5M5.5 16v-4h13v4" />
    </>
  ),
  message: (
    <>
      <path d="M4 4h16v12H9l-5 4Z" />
      <path d="M8 8h8m-8 4h5" />
    </>
  ),
  cache: (
    <>
      <path d="M4 9a8 8 0 0 1 13-4l3 3M20 3v5h-5M20 15a8 8 0 0 1-13 4l-3-3M4 21v-5h5" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="9" r="5" />
      <path d="m12 13 8 8m-3-3 3-3m-6 0 3-3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
  settings: (
    <>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="8" cy="6" r="2" />
      <circle cx="16" cy="12" r="2" />
      <circle cx="10" cy="18" r="2" />
    </>
  ),
  activity: (
    <>
      <path d="M3 13h4l3-8 4 14 3-6h4" />
    </>
  ),
  arrow: (
    <>
      <path d="M4 12h16m-6-6 6 6-6 6" />
    </>
  ),
  check: (
    <>
      <path d="m5 12 4 4L19 6" />
    </>
  ),
  alert: (
    <>
      <path d="m12 3 10 18H2Z" />
      <path d="M12 9v4m0 3v1" />
    </>
  ),
  book: (
    <>
      <path d="M3 4h6a4 4 0 0 1 3 2 4 4 0 0 1 3-2h6v15h-6a4 4 0 0 0-3 2 4 4 0 0 0-3-2H3Z" />
      <path d="M12 6v15" />
    </>
  ),
  file: (
    <>
      <path d="M5 3h9l5 5v13H5Z" />
      <path d="M14 3v6h5M8 13h8m-8 4h6" />
    </>
  ),
  link: (
    <>
      <path d="m10 8 2-2a5 5 0 0 1 7 7l-2 2M14 16l-2 2a5 5 0 0 1-7-7l2-2m1 7 8-8" />
    </>
  ),
  server: (
    <>
      <rect x="3" y="3" width="18" height="7" rx="2" />
      <rect x="3" y="14" width="18" height="7" rx="2" />
      <path d="M7 6v1m0 10v1m5-12h5m-5 11h5" />
    </>
  ),
  bulb: (
    <>
      <path d="M8 17c0-4-3-4-3-8a7 7 0 0 1 14 0c0 4-3 4-3 8Z" />
      <path d="M8 20h8m-6 3h4" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  className = "icon",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function taskIcon(taskId: string): IconName {
  return (
    (
      {
        http: "message",
        cache: "cache",
        dns: "network",
        session: "key",
      } as const
    )[taskId as "http" | "cache" | "dns" | "session"] || "book"
  );
}
