import { describe, expect, it } from "vitest";

import { classifyCourseEmbed } from "./course-embeds";

describe("course embeds", () => {
  it("classifies image URLs for rich course rendering", () => {
    expect(
      classifyCourseEmbed("https://cdn.example.dev/rag-architecture.webp"),
    ).toMatchObject({
      type: "image",
      url: "https://cdn.example.dev/rag-architecture.webp",
      label: "cdn.example.dev",
    });
  });

  it("classifies YouTube URLs with an embeddable player URL", () => {
    expect(
      classifyCourseEmbed("https://www.youtube.com/watch?v=abc123XYZ"),
    ).toMatchObject({
      type: "video",
      url: "https://www.youtube.com/watch?v=abc123XYZ",
      embedUrl: "https://www.youtube-nocookie.com/embed/abc123XYZ",
      label: "YouTube",
      source: "youtube",
    });
  });

  it("classifies local media library assets without allowing traversal", () => {
    expect(
      classifyCourseEmbed(
        "/uploads/course-media/00000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp",
      ),
    ).toMatchObject({
      type: "image",
      url: "/uploads/course-media/00000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp",
      label: "RubberDuck upload",
    });

    expect(
      classifyCourseEmbed(
        "/uploads/course-media/00000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.mp4",
      ),
    ).toMatchObject({
      type: "video",
      url: "/uploads/course-media/00000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.mp4",
      label: "RubberDuck upload",
      source: "file",
    });

    expect(
      classifyCourseEmbed(
        "/uploads/course-media/00000000-0000-4000-8000-000000000001/../../secret.png",
      ),
    ).toBeNull();
  });

  it("classifies notebook URLs separately from generic links", () => {
    expect(
      classifyCourseEmbed(
        "https://colab.research.google.com/github/devit/examples/blob/main/rag.ipynb",
      ),
    ).toMatchObject({
      type: "notebook",
      label: "Google Colab",
    });
  });

  it("falls back to safe links and rejects invalid URLs", () => {
    expect(classifyCourseEmbed("https://docs.example.dev/rag")).toMatchObject({
      type: "link",
      label: "docs.example.dev",
    });
    expect(classifyCourseEmbed("javascript:alert(1)")).toBeNull();
  });
});
