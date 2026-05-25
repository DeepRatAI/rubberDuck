import { describe, expect, it } from "vitest";

import { curatedRssSources } from "./rss-sources";

describe("curated RSS sources", () => {
  it("keeps an English technical source set large enough for cold-start discovery", () => {
    expect(curatedRssSources.length).toBeGreaterThanOrEqual(20);
    expect(curatedRssSources.length).toBeLessThanOrEqual(50);
    expect(new Set(curatedRssSources.map((source) => source.url)).size).toBe(
      curatedRssSources.length,
    );
    expect(curatedRssSources.every((source) => source.language === "en")).toBe(
      true,
    );
  });
});
