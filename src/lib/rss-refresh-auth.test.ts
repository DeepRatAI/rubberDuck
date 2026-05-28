import { describe, expect, it } from "vitest";

import { hasRssRefreshAccess } from "./rss-refresh-auth";

describe("RSS refresh authorization", () => {
  const secrets = {
    cronSecret: "vercel-cron-secret",
    refreshSecret: "manual-refresh-secret",
  };

  it("accepts Vercel Cron bearer authorization separately from the manual refresh secret", () => {
    expect(
      hasRssRefreshAccess(
        { authorization: "Bearer vercel-cron-secret" },
        secrets,
      ),
    ).toBe(true);
  });

  it("accepts the RubberDuck refresh header for manual operator refreshes", () => {
    expect(
      hasRssRefreshAccess({ headerSecret: "manual-refresh-secret" }, secrets),
    ).toBe(true);
  });

  it("rejects missing and unrelated secrets", () => {
    expect(hasRssRefreshAccess({}, secrets)).toBe(false);
    expect(
      hasRssRefreshAccess({ authorization: "Bearer wrong" }, secrets),
    ).toBe(false);
  });
});
