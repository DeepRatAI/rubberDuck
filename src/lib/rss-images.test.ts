import { describe, expect, it } from "vitest";

import { extractOpenGraphImage, isSafeRemoteHttpUrl } from "./rss-images";

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

  it("rejects unsafe image URLs and internal fetch targets", () => {
    expect(
      extractOpenGraphImage(
        '<meta property="og:image" content="data:text/html,<script>alert(1)</script>">',
        "https://example.dev/post",
      ),
    ).toBeNull();
    expect(isSafeRemoteHttpUrl("http://localhost/admin")).toBe(false);
    expect(isSafeRemoteHttpUrl("http://127.0.0.1/admin")).toBe(false);
    expect(isSafeRemoteHttpUrl("http://192.168.1.20/admin")).toBe(false);
    expect(isSafeRemoteHttpUrl("https://example.dev/post")).toBe(true);
  });
});
