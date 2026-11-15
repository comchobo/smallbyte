import { LearningScreen } from "@/components/learning-screen";

export default async function Page({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  return (
    <LearningScreen key={taskId} route={{ page: "preview", task: taskId }} />
  );
}
