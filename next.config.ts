import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

function originFromUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const isDevelopment = process.env.NODE_ENV === "development";
const posthogOrigin = originFromUrl(
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
);
const mediaOrigin = originFromUrl(process.env.R2_PUBLIC_BASE_URL);
const connectSrc = [
  "'self'",
  "blob:",
  "https://*.sentry.io",
  "https://*.ingest.sentry.io",
  "https://*.ingest.us.sentry.io",
  "https://cdn.jsdelivr.net",
  "https://challenges.cloudflare.com",
  posthogOrigin,
].filter(Boolean);
const imgSrc = ["'self'", "blob:", "data:", "https:", mediaOrigin].filter(
  Boolean,
);
const mediaSrc = ["'self'", "blob:", "data:", mediaOrigin].filter(Boolean);

const cspHeader = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDevelopment ? " 'unsafe-eval'" : ""} https://cdn.jsdelivr.net https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src ${imgSrc.join(" ")}`,
  `media-src ${mediaSrc.join(" ")}`,
  `connect-src ${connectSrc.join(" ")}`,
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://colab.research.google.com https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    serverActions: {
      bodySizeLimit: "64mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
});
