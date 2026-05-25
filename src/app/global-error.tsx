"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="flex min-h-dvh items-center justify-center bg-[color:var(--background)] p-6 text-[color:var(--foreground)]">
          <section className="w-full max-w-lg rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
            <BrandMark />
            <h1 className="mt-6 text-2xl font-semibold">
              RubberDuck hit an unexpected error.
            </h1>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
              The incident has been prepared for error monitoring when Sentry is
              configured. Retry the view or return to the app shell.
            </p>
            {error.digest ? (
              <p className="mt-3 font-mono text-xs text-[color:var(--muted)]">
                Digest: {error.digest}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" variant="primary" onClick={reset}>
                Retry
              </Button>
              <Button asChild>
                <a href="/app">Go home</a>
              </Button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
