import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용약관 | smallbyte",
};

export default function Page() {
  return (
    <main className="page policy-page" id="main">
      <h1>이용약관</h1>
      <p>내용을 준비 중입니다.</p>
      <Link href="/">홈으로 돌아가기</Link>
    </main>
  );
}
