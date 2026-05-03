import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

// Boot-time validation of critical env vars in production. Fail fast instead
// of silently sending broken password-reset emails or generating bad redirects.
if (process.env.NODE_ENV === "production") {
  const required = [
    "DATABASE_URL",
    "NEXTAUTH_URL",
    "NEXTAUTH_SECRET",
    "ANTHROPIC_API_KEY",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}

// Permissive baseline CSP. It's strict enough to block most XSS-via-third-party
// scenarios without requiring per-script nonces (which would force a rewrite of
// every inline <script> Next emits). Tighten with nonces later if desired.
const csp = [
  "default-src 'self'",
  // 'unsafe-inline' covers Next's hydration scripts and data attributes;
  // 'unsafe-eval' is needed by some Next/React DevTools paths in dev. Both are
  // acceptable trade-offs given there are no third-party script origins.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Tailwind + shadcn inject inline styles via JS at runtime.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Only same-origin fetch is needed (Anthropic/Resend run server-side).
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
].join("; ");

// Conservative security headers — applied to every response, including API
// routes. Tweak CSP if you load third-party scripts beyond what's already used.
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // HSTS only matters in production over HTTPS; harmless on localhost (the
  // browser ignores it for HTTP).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Reduce information leakage in headers
  poweredByHeader: false,
  // Use webpack for build (required for next-pwa)
  turbopack: {},
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withPWA(nextConfig);
