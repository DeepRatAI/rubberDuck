import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createLocalPostMediaStorageAdapter,
  createPostMediaStorageAdapter,
  createR2PostMediaStorageAdapter,
} from "./post-media-storage-adapter";

describe("post media storage adapter", () => {
  it("stores local Binnacle media through a safe immutable object path", async () => {
    const rootDirectory = await mkdtemp(
      path.join(tmpdir(), "rubberduck-post-media-"),
    );
    const adapter = createLocalPostMediaStorageAdapter({ rootDirectory });
    const localObjectKey =
      "00000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp";

    try {
      const result = await adapter.put({
        ownerId: "00000000-0000-4000-8000-000000000001",
        assetId: "11111111-1111-4111-8111-111111111111",
        extension: "webp",
        contentType: "image/webp",
        bytes: Buffer.from("image-bytes"),
      });

      expect(result).toMatchObject({
        driver: "local",
        publicUrl:
          "/uploads/posts/00000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp",
        storageKey:
          "uploads/posts/00000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp",
      });
      await expect(
        readFile(path.join(rootDirectory, localObjectKey), "utf8"),
      ).resolves.toBe("image-bytes");

      await result.rollback();
      await expect(
        readFile(path.join(rootDirectory, localObjectKey), "utf8"),
      ).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(rootDirectory, { force: true, recursive: true });
    }
  });

  it("stores Binnacle media in R2-compatible object storage with content headers", async () => {
    const puts: Array<Record<string, unknown>> = [];
    const deletes: Array<Record<string, unknown>> = [];
    const adapter = createR2PostMediaStorageAdapter({
      bucket: "dev4all",
      publicBaseUrl: "https://media.example.dev/",
      client: {
        putObject: async (input) => {
          puts.push(input);
        },
        deleteObject: async (input) => {
          deletes.push(input);
        },
      },
    });

    const result = await adapter.put({
      ownerId: "00000000-0000-4000-8000-000000000001",
      assetId: "11111111-1111-4111-8111-111111111111",
      extension: "mp4",
      contentType: "video/mp4",
      bytes: Buffer.from("video-bytes"),
    });

    expect(result).toMatchObject({
      driver: "r2",
      publicUrl:
        "https://media.example.dev/uploads/posts/00000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.mp4",
      storageKey:
        "uploads/posts/00000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.mp4",
    });
    expect(puts).toEqual([
      {
        Bucket: "dev4all",
        Key: result.storageKey,
        Body: Buffer.from("video-bytes"),
        ContentType: "video/mp4",
        CacheControl: "public, max-age=31536000, immutable",
      },
    ]);

    await result.rollback();

    expect(deletes).toEqual([
      {
        Bucket: "dev4all",
        Key: result.storageKey,
      },
    ]);
  });

  it("fails explicitly for unconfigured cloud storage drivers", () => {
    expect(() => createPostMediaStorageAdapter("r2")).toThrow(
      /R2 storage requires R2_BUCKET, R2_PUBLIC_BASE_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY/i,
    );
    expect(() => createPostMediaStorageAdapter("supabase")).toThrow(
      /STORAGE_DRIVER=supabase is configured but no object storage adapter is installed/i,
    );
  });
});
