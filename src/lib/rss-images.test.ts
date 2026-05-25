import { describe, expect, it } from "vitest";

import { extractOpenGraphImage } from "./rss-images";

describe("RSS visual extraction", () => {
  it("extracts absolute Open Graph images before RubberDuck fallback is needed", () => {
    const image = extractOpenGraphImage(
      '<html><head><meta property="og:image" content="https://cdn.example.dev/cover.jpg"></head></html>',
      "https://example.dev/post",
    );

    expect(image).toBe("https://cdn.example.dev/cover.jpg");
  });

  it("resolves relative Twitter images from the original article URL", () => {
    const image = extractOpenGraphImage(
      '<meta name="twitter:image" content="/assets/social.png">',
      "https://example.dev/blog/post",
    );

    expect(image).toBe("https://example.dev/assets/social.png");
  });

  it("returns null when no source visual exists", () => {
    expect(
      extractOpenGraphImage("<title>No image</title>", "https://x.dev"),
    ).toBeNull();
  });
});
