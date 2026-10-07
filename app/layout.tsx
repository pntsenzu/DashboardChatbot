import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth";
import { AppShellClient } from "@/components/app-shell-client";
import { I18nProvider } from "@/components/i18n-provider";
import { Toaster } from "@/components/ui/sonner";
import { authOptions } from "@/lib/auth";
import { getDict, getLocale } from "@/lib/i18n-server";
import { rpc, isMockMode } from "@/lib/senzu-api";

// Inter có subset tiếng Việt; fallback chữ Nhật khai báo trong tailwind.config (§5).
const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});

/** Tiêu đề/mô tả trang theo ngôn ngữ hiện tại (cookie `senzu-locale`). */
export async function generateMetadata(): Promise<Metadata> {
  const t = getDict();
  return {
    title: { default: t.meta.title, template: `%s · ${t.meta.title}` },
    description: t.meta.description,
    icons: { icon: "/logo.png" },
  };
}

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

  const locale = getLocale();
  const t = getDict();

  return (
    <html lang={t.htmlLang} className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="font-sans antialiased">
        <I18nProvider locale={locale} t={t}>
          <AppShellClient
            openAttentionCount={openAttentionCount ?? undefined}
            botStatusIsStale={botStatusIsStale}
            user={session?.user ?? null}
            mockMode={isMockMode()}
          >
            {children}
          </AppShellClient>
        </I18nProvider>
        {/* MỘT instance Toaster duy nhất (§16) */}
        <Toaster />
      </body>
    </html>
  );
}
