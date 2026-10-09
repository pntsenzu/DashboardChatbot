/**
 * Bảo mật response header (DEF-11 / TC-G09).
 *
 * - `poweredByHeader: false` -> bỏ `x-powered-by: Next.js` (không lộ stack).
 * - CSP giữ `script-src 'unsafe-inline'` vì theme-init và bootstrap của Next.js
 *   là inline script; `upgrade-insecure-requests` CỐ Ý không đặt để không phá
 *   môi trường dev chạy qua http://localhost.
 * - HSTS chỉ có hiệu lực khi trang được phục vụ qua HTTPS; gửi trước ở localhost
 *   là vô hại và sẵn sàng cho môi trường production.
 */
/**
 * `next dev` BẮT BUỘC đóng gói chunk bằng devtool `eval-source-map` (webpack
 * tự ép, config có sửa cũng bị Next revert về eval) -> mọi chunk chứa eval().
 * Nếu `script-src` thiếu `unsafe-eval`, trình duyệt chặn hết JS -> React không
 * hydrate -> mọi nút onClick (bộ lọc ngày, đổi cột/đường, tab) đều không bấm
 * được. Vì vậy development thêm `unsafe-eval`, production giữ CSP chặt như cũ
 * (bundle production không dùng eval nên không cần).
 */
const isDev = process.env.NODE_ENV !== "production";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      isDev
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        : "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' ws://localhost:* wss://localhost:* http://localhost:*",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "manifest-src 'self'",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), usb=(), xr-spatial-tracking=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['lucide-react', 'recharts'],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
