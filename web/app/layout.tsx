import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "smallbyte",
  description: "smallbyte 애플리케이션 연결 상태",
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
      <body>{children}</body>
    </html>
  );
}
