import type { ReactNode } from "react";
import type { Page } from "@/lib/routes";

export type CourseMapRenderer = (
  mini?: boolean,
  target?: string | null,
) => ReactNode;

export type Navigate = (page: Page, task?: string, record?: string) => void;
