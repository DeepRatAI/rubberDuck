import { describe, expect, it, vi } from "vitest";

import { summarizeRssHealth, type RssSourceHealth } from "./rss";

describe("RSS source health", () => {
  it("summarizes source freshness without counting disabled feeds as stale", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-23T12:00:00.000Z"));
    const sources: RssSourceHealth[] = [
      {
        id: "fresh",
        name: "Fresh",
        url: "https://example.dev/rss.xml",
        enabled: true,
        itemCount: 3,
        latestItemAt: "2026-05-22T12:00:00.000Z",
        latestItemTitle: "Fresh article",
        latestItemUrl: "https://example.dev/articles/fresh",
      },
      {
        id: "stale",
        name: "Stale",
        url: "https://stale.dev/rss.xml",
        enabled: true,
        itemCount: 1,
        latestItemAt: "2026-04-01T12:00:00.000Z",
        latestItemTitle: "Old article",
        latestItemUrl: "https://stale.dev/articles/old",
      },
      {
        id: "disabled",
        name: "Disabled",
        url: "https://disabled.dev/rss.xml",
        enabled: false,
        itemCount: 8,
        latestItemAt: null,
        latestItemTitle: null,
        latestItemUrl: null,
      },
    ];

    expect(summarizeRssHealth(sources)).toEqual({
      sources: 3,
      enabled: 2,
      totalItems: 12,
      staleSources: 1,
    });
    vi.useRealTimers();
  });
});
