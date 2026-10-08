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
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
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
