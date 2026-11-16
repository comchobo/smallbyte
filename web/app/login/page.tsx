import { LearningScreen } from "@/components/learning-screen";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string; reason?: string }>;
}) {
  const { auth, reason } = await searchParams;
  return (
    <LearningScreen
      route={{ page: "login" }}
      authFailed={auth === "failed"}
      sessionExpired={reason === "expired"}
    />
  );
}
