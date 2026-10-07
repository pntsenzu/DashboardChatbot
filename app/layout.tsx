import type { Metadata } from "next";
import "./globals.css";
import { AppShellClient } from "@/components/app-shell-client";
import { rpc } from "@/lib/senzu-api";
import { SystemStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Senzu Chatbot Dashboard",
  description: "Dashboard quản lý tin nhắn, khách hàng và hiệu suất AI Chatbot Senzu Messenger",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let openAttentionCount = 0;
  let botStatusIsStale = false;

  try {
    const [count, status] = await Promise.all([
      rpc<number>("getOpenAttentionCount"),
      rpc<SystemStatus>("getSystemStatus"),
    ]);
    openAttentionCount = count || 0;
    botStatusIsStale = status?.isStale ?? false;
  } catch (e) {
    console.error("Failed to load header stats", e);
  }

  return (
    <html lang="vi">
      <body>
        <AppShellClient openAttentionCount={openAttentionCount} botStatusIsStale={botStatusIsStale}>
          {children}
        </AppShellClient>
      </body>
    </html>
  );
}
