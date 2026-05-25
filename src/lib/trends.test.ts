import { describe, expect, it } from "vitest";

import { buildExternalTrends, type TrendInputItem } from "./trends";

const now = new Date("2026-05-24T18:00:00.000Z");

function item(
  title: string,
  sourceName: string,
  tags: string[],
  hoursAgo: number,
): TrendInputItem {
  return {
    title,
    summary: title,
    url: `https://example.com/${sourceName}/${title}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-"),
    sourceName,
    tags,
    publishedAt: new Date(now.getTime() - hoursAgo * 60 * 60 * 1000),
  };
}

describe("buildExternalTrends", () => {
  it("ranks today trends from external RSS articles instead of static labels", () => {
    const trends = buildExternalTrends(
      [
        item("OpenAI ships new Codex agent controls", "OpenAI News", ["ai"], 2),
        item("GitHub improves AI agent workflows", "GitHub Blog", ["github"], 3),
        item(
          "Hugging Face publishes AI agents guide",
          "Hugging Face Blog",
          ["machine-learning"],
          4,
        ),
        item("Postgres releases planner improvements", "Postgres Weekly", ["postgres"], 5),
      ],
      { now },
    );

    expect(trends[0]?.label).toBe("AI agents");
    expect(trends[0]?.articleCount).toBe(3);
    expect(trends[0]?.sourceCount).toBe(3);
    expect(trends[0]?.window).toBe("today");
    expect(trends.map((trend) => trend.label)).not.toContain("TinyGrad");
  });

  it("falls back to a recent RSS window when today has too little evidence", () => {
    const trends = buildExternalTrends(
      [
        item("WebGPU production debugging notes", "Mozilla Hacks", ["web"], 72),
        item("WebGPU compute lands in a new browser build", "Google Developers", ["web"], 96),
      ],
      { now },
    );

    expect(trends[0]?.label).toBe("WebGPU");
    expect(trends[0]?.window).toBe("recent");
  });
});
