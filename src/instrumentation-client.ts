import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const posthogToken = process.env.NEXT_PUBLIC_POSTHOG_TOKEN;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (typeof window !== "undefined" && sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: false,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 0.1 : 0.02,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

if (typeof window !== "undefined" && posthogToken) {
  posthog.init(posthogToken, {
    api_host: posthogHost || "https://us.i.posthog.com",
    defaults: "2026-01-30",
    person_profiles: "identified_only",
    capture_pageview: true,
    autocapture: false,
    disable_session_recording: true,
    respect_dnt: true,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
