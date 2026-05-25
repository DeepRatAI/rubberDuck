import { describe, expect, it } from "vitest";

import {
  COURSE_MEDIA_MAX_BYTES,
  buildCourseMediaPublicPath,
  filterCourseMediaAssets,
  normalizeCourseMediaMetadata,
  validateCourseMediaFile,
} from "./course-media";

describe("course media assets", () => {
  it("accepts safe image and video uploads with generated public paths", () => {
    expect(
      validateCourseMediaFile({
        name: "rag-architecture.final.png",
        mimeType: "image/png",
        byteSize: 1024,
      }),
    ).toEqual({
      error: null,
      extension: "png",
      kind: "image",
    });

    expect(
      validateCourseMediaFile({
        name: "walkthrough.webm",
        mimeType: "video/webm",
        byteSize: 4096,
      }),
    ).toEqual({
      error: null,
      extension: "webm",
      kind: "video",
    });

    expect(
      buildCourseMediaPublicPath({
        ownerId: "00000000-0000-4000-8000-000000000001",
        assetId: "11111111-1111-4111-8111-111111111111",
        extension: "webp",
      }),
    ).toBe(
      "/uploads/course-media/00000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp",
    );
  });

  it("rejects executable, svg, empty, and oversized uploads", () => {
    expect(
      validateCourseMediaFile({
        name: "payload.svg",
        mimeType: "image/svg+xml",
        byteSize: 1024,
      }),
    ).toMatchObject({ error: "Unsupported media type." });

    expect(
      validateCourseMediaFile({
        name: "payload.js",
        mimeType: "text/javascript",
        byteSize: 1024,
      }),
    ).toMatchObject({ error: "Unsupported media type." });

    expect(
      validateCourseMediaFile({
        name: "empty.png",
        mimeType: "image/png",
        byteSize: 0,
      }),
    ).toMatchObject({ error: "Media file is empty." });

    expect(
      validateCourseMediaFile({
        name: "huge.mp4",
        mimeType: "video/mp4",
        byteSize: COURSE_MEDIA_MAX_BYTES + 1,
      }),
    ).toMatchObject({ error: "Media file is too large." });
  });

  it("normalizes editorial metadata for accessible course media", () => {
    expect(
      normalizeCourseMediaMetadata({
        altText: "  RAG architecture diagram  ",
        caption: "  Retrieval flow used by the runnable lesson.  ",
        labels: ["  RAG  ", "architecture", "rag", "", "Runtime QA"],
      }),
    ).toEqual({
      altText: "RAG architecture diagram",
      caption: "Retrieval flow used by the runnable lesson.",
      labels: ["rag", "architecture", "runtime-qa"],
    });

    expect(
      normalizeCourseMediaMetadata({
        altText: "   ",
        caption: "   ",
        labels: [],
      }),
    ).toEqual({
      altText: null,
      caption: null,
      labels: [],
    });
  });

  it("filters media assets by kind and editorial search text", () => {
    const assets = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        ownerId: "00000000-0000-4000-8000-000000000001",
        kind: "image",
        originalFileName: "rag-architecture.png",
        mimeType: "image/png",
        byteSize: 2048,
        url: "/uploads/course-media/00000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.png",
        altText: "RAG architecture diagram",
        caption: "Retrieval flow used by the runnable lesson.",
        labels: ["rag", "architecture"],
        createdAt: "2026-05-09T12:00:00.000Z",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        ownerId: "00000000-0000-4000-8000-000000000001",
        kind: "video",
        originalFileName: "colab-runtime-tour.webm",
        mimeType: "video/webm",
        byteSize: 4096,
        url: "/uploads/course-media/00000000-0000-4000-8000-000000000001/22222222-2222-4222-8222-222222222222.webm",
        altText: "Colab runtime walkthrough",
        caption: null,
        labels: ["runtime"],
        createdAt: "2026-05-09T12:05:00.000Z",
      },
    ] as const;

    expect(
      filterCourseMediaAssets(assets, {
        label: "architecture",
        kind: "image",
        query: "rag",
      }).map((asset) => asset.originalFileName),
    ).toEqual(["rag-architecture.png"]);

    expect(
      filterCourseMediaAssets(assets, {
        kind: "video",
        query: "RUNTIME",
      }).map((asset) => asset.originalFileName),
    ).toEqual(["colab-runtime-tour.webm"]);

    expect(
      filterCourseMediaAssets(assets, {
        kind: "all",
        query: "missing",
      }),
    ).toEqual([]);
  });
});
