import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";
import "./prototype-font.css";

export const metadata: Metadata = {
  title: "smallbyte",
  description:
    "작은 실험으로 배우는 웹 CS. 나에게 맞는 코스를 따라가고 작업물에 대한 대화로 이해를 확인하세요.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
