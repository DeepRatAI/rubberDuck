import { describe, expect, it } from "vitest";

import {
  buildPortableShareText,
  buildShareText,
  createCanonicalUrl,
  createSocialShareUrl,
  normalizeShareDescription,
} from "./share";

describe("share utilities", () => {
  it("builds canonical RubberDuck URLs from paths and absolute URLs", () => {
    expect(createCanonicalUrl("/binnacle/post-1", "https://rubberduck.net")).toBe(
      "https://rubberduck.net/binnacle/post-1",
    );
    expect(
      createCanonicalUrl(
        "https://rubberduck.net/courses/rag?lang=es",
        "http://localhost:3000",
      ),
    ).toBe("https://rubberduck.net/courses/rag?lang=es");
  });

  it("normalizes long descriptions for previews and share text", () => {
    expect(normalizeShareDescription("Line one\n\nLine two", 20)).toBe(
      "Line one Line two",
    );
    expect(normalizeShareDescription("a".repeat(200), 20)).toBe(
      `${"a".repeat(17)}...`,
    );
  });

  it("creates compact share text with title and description", () => {
    expect(buildShareText("Project Signal", "Looking for contributors")).toBe(
      "Project Signal - Looking for contributors",
    );
  });

  it("creates portable share copy for apps without public share intents", () => {
    expect(
      buildPortableShareText({
        url: "https://rubberduck.net/binnacle/post-1",
        title: "Project Signal",
        description: "Looking for contributors",
        hashtags: ["RubberDuck", "AI Engineering"],
      }),
    ).toBe(
      [
        "Project Signal - Looking for contributors",
        "https://rubberduck.net/binnacle/post-1",
        "#RubberDuck #AIEngineering",
      ].join("\n\n"),
    );
  });

  it("builds encoded social share URLs", () => {
    const url = "https://rubberduck.net/binnacle/post-1";
    const title = "Project Signal: DeepRatAI/rubberDuck";

    expect(createSocialShareUrl("x", { url, title })).toContain(
      "https://twitter.com/intent/tweet?",
    );
    expect(createSocialShareUrl("reddit", { url, title })).toContain(
      "https://www.reddit.com/submit?",
    );
    expect(createSocialShareUrl("linkedin", { url, title })).toBe(
      "https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Frubberduck.net%2Fbinnacle%2Fpost-1",
    );
  });
});
