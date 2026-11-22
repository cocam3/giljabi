import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "길잡이",
  description: "진로에서 졸업까지, 내 전공 설계를 한 곳에서",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-dvh bg-slate-50 font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
