import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

/*
 * Nguồn sự thật: ui-design-spec.html mục 17 (Phụ lục mã nguồn).
 * Mỗi tone có 4 biến: DEFAULT / foreground / subtle / border.
 */
const tone = (name: string) => ({
  DEFAULT: `hsl(var(--${name}))`,
  foreground: `hsl(var(--${name}-foreground))`,
  subtle: `hsl(var(--${name}-subtle))`,
  border: `hsl(var(--${name}-border))`,
});

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: { center: true, padding: "1.5rem" },
    extend: {
      fontFamily: {
        sans: [
          "var(--font-sans)",
          '"Hiragino Sans"',
          '"Hiragino Kaku Gothic ProN"',
          '"Yu Gothic UI"',
          "Meiryo",
          '"Noto Sans JP"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        // Chỉ thêm 2 cỡ ngoài thang Tailwind (§5).
        "2xs": ["11px", { lineHeight: "16px" }],
        metric: ["28px", { lineHeight: "32px", letterSpacing: "-0.02em" }],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          hover: "hsl(var(--primary-hover))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: tone("destructive"),
        warning: tone("warning"),
        success: tone("success"),
        info: tone("info"),
        priority: tone("priority"),
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          border: "hsl(var(--sidebar-border))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 hsl(222 25% 11% / 0.05)",
        md: "0 4px 12px -2px hsl(222 25% 11% / 0.10), 0 2px 6px -2px hsl(222 25% 11% / 0.06)",
        lg: "0 16px 40px -12px hsl(222 25% 11% / 0.22)",
      },
      transitionDuration: { DEFAULT: "150ms" },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      // §15: vùng chạm ≥44px trên thiết bị cảm ứng.
      addVariant("coarse", "@media (pointer: coarse)");
      addVariant("fine", "@media (pointer: fine)");
    }),
  ],
};
export default config;
