import { LearningScreen } from "@/components/learning-screen";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const { auth } = await searchParams;
  return (
    <LearningScreen
      route={{ page: "landing" }}
      authFailed={auth === "failed"}
    />
  );
}
