import type { Metadata } from "next";
import "./globals.css";
import { getServerSession } from "next-auth";
import { AppShellClient } from "@/components/app-shell-client";
import { authOptions } from "@/lib/auth";
import { rpc, isMockMode } from "@/lib/senzu-api";
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
  let openAttentionCount: number | null = null;
  let botStatusIsStale: boolean | null = null;

  const [session] = await Promise.all([
    getServerSession(authOptions),
    (async () => {
      try {
        const [count, status] = await Promise.all([
          rpc<number>("getOpenAttentionCount"),
          rpc<SystemStatus>("getSystemStatus"),
        ]);
        openAttentionCount = typeof count === "number" ? count : 0;
        botStatusIsStale = status?.isStale ?? null;
      } catch (e) {
        // Giữ nguyên null -> UI hiển thị "không rõ", KHÔNG giả vờ bot đang chạy.
        console.error("Failed to load header stats", e);
      }
    })(),
  ]);

  return (
    <html lang="vi">
      <body>
        <AppShellClient
          openAttentionCount={openAttentionCount ?? undefined}
          botStatusIsStale={botStatusIsStale}
          user={session?.user ?? null}
          mockMode={isMockMode()}
        >
          {children}
        </AppShellClient>
      </body>
    </html>
  );
}
