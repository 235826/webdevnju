import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "足球赛事信息与互动预测平台",
  description: "赛事浏览、比分预测、收藏和赛后讨论平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
