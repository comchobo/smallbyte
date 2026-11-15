import { LearningScreen } from "@/components/learning-screen";

export default async function Page({
  params,
}: {
  params: Promise<{ recordId: string }>;
}) {
  const { recordId } = await params;
  return (
    <LearningScreen
      key={recordId}
      route={{ page: "result", record: recordId }}
    />
  );
}
