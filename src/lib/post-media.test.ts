import { describe, expect, it } from "vitest";

import {
  buildPostMediaPublicPath,
  isPostMediaPublicPath,
  validatePostMediaFile,
} from "./post-media";

describe("post media", () => {
  it("validates supported Binnacle media files", () => {
    expect(
      validatePostMediaFile({
        fileName: "demo.gif",
        mimeType: "image/gif",
        byteSize: 1024,
      }),
    ).toEqual({
      error: null,
      extension: "gif",
      kind: "image",
    });
  });

  it("rejects unsupported media files", () => {
    expect(
      validatePostMediaFile({
        fileName: "archive.zip",
        mimeType: "application/zip",
        byteSize: 1024,
      }),
    ).toEqual({ error: "Unsupported media type." });
  });

  it("builds and recognizes only immutable post media paths", () => {
    const path = buildPostMediaPublicPath({
      ownerId: "00000000-0000-4000-8000-000000000001",
      assetId: "11111111-1111-4111-8111-111111111111",
      extension: "webp",
    });

    expect(path).toBe(
      "/uploads/posts/00000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp",
    );
    expect(isPostMediaPublicPath(path)).toBe(true);
    expect(isPostMediaPublicPath("/uploads/posts/user/../../secret.png")).toBe(
      false,
    );
  });
});
