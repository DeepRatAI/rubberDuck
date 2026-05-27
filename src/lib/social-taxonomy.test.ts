import { describe, expect, it } from "vitest";

import {
  getTagCategory,
  normalizeTagLabels,
  toTagSlug,
} from "./social-taxonomy";

describe("social taxonomy", () => {
  it("creates stable slugs for controlled and custom tags", () => {
    expect(toTagSlug("AI Engineering")).toBe("ai-engineering");
    expect(toTagSlug("#PostgreSQL / RAG")).toBe("postgresql-rag");
  });

  it("classifies controlled tags for matching and ranking", () => {
    expect(getTagCategory("AI Engineering")).toBe("domain");
    expect(getTagCategory("TypeScript")).toBe("stack");
    expect(getTagCategory("Technical feedback")).toBe("need");
    expect(getTagCategory("Build in public")).toBe("intent");
    expect(getTagCategory("my custom tag")).toBe("custom");
  });

  it("deduplicates tag labels by slug while preserving display labels", () => {
    expect(
      normalizeTagLabels(["AI Engineering", "#ai-engineering", "TypeScript"]),
    ).toEqual(["AI Engineering", "TypeScript"]);
  });
});
