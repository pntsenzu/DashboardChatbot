import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth";
import { AppShellClient } from "@/components/app-shell-client";
import { Toaster } from "@/components/ui/sonner";
import { authOptions } from "@/lib/auth";
import { rpc, isMockMode } from "@/lib/senzu-api";

// Inter có subset tiếng Việt; fallback chữ Nhật khai báo trong tailwind.config (§5).
const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Senzu Chatbot Dashboard",
  description: "Dashboard quản lý tin nhắn, khách hàng và hiệu suất AI Chatbot Senzu Messenger",
  icons: { icon: "/logo.png" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  viewportFit: "cover",
};

/** Khôi phục theme trước khi paint để tránh chớp màu khi tải lại trang. */
const themeInit = `(function(){try{var t=localStorage.getItem("senzu-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})();`;

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
          rpc("getOpenAttentionCount"),
          rpc("getSystemStatus"),
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
    <html lang="vi" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="font-sans antialiased">
        <AppShellClient
          openAttentionCount={openAttentionCount ?? undefined}
          botStatusIsStale={botStatusIsStale}
          user={session?.user ?? null}
          mockMode={isMockMode()}
        >
          {children}
        </AppShellClient>
        {/* MỘT instance Toaster duy nhất (§16) */}
        <Toaster />
      </body>
    </html>
  );
}
