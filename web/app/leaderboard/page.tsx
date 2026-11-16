import type { Metadata } from "next";
import { LearningScreen } from "@/components/learning-screen";

export const metadata: Metadata = { title: "리더보드 · smallbyte" };

export default function Page() {
  return <LearningScreen route={{ page: "leaderboard" }} />;
}
