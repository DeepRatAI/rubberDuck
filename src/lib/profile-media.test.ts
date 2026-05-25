import { describe, expect, it } from "vitest";

import {
  buildProfileMediaPublicPath,
  isProfileMediaPublicPath,
  validateProfileMediaFile,
} from "./profile-media";

describe("profile media", () => {
  it("accepts safe profile image paths and rejects traversal-shaped paths", () => {
    const path = buildProfileMediaPublicPath({
      kind: "avatar",
      ownerId: "00000000-0000-4000-8000-000000000001",
      assetId: "10000000-0000-4000-8000-000000000001",
      extension: "png",
    });

    expect(path).toBe(
      "/uploads/profile-media/avatar/00000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000001.png",
    );
    expect(isProfileMediaPublicPath(path)).toBe(true);
    expect(
      isProfileMediaPublicPath(
        "/uploads/profile-media/avatar/../../secret.png",
      ),
    ).toBe(false);
  });

  it("bounds profile media to images and a small upload budget", () => {
    expect(
      validateProfileMediaFile({
        fileName: "avatar.png",
        mimeType: "image/png",
        byteSize: 1024,
      }),
    ).toMatchObject({ error: null, extension: "png" });

    expect(
      validateProfileMediaFile({
        fileName: "clip.mp4",
        mimeType: "video/mp4",
        byteSize: 1024,
      }),
    ).toEqual({ error: "Unsupported profile image type." });
  });
});
