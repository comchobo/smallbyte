import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";
import "./prototype-font.css";

export const metadata: Metadata = {
  title: "smallbyte",
  description:
    "작은 실험으로 배우는 웹 CS. 나에게 맞는 코스를 따라가고 작업물에 대한 대화로 이해를 확인하세요.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%233d542e'/%3E%3Ctext x='8' y='24' fill='white' font-size='25' font-family='sans-serif'%3Es%3C/text%3E%3C/svg%3E",
  },
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
