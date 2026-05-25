import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createCourseMediaStorageAdapter,
  createLocalCourseMediaStorageAdapter,
  createR2CourseMediaStorageAdapter,
} from "./course-media-storage-adapter";

describe("course media storage adapter", () => {
  it("stores local media through the adapter contract and exposes a public URL", async () => {
    const rootDirectory = await mkdtemp(path.join(tmpdir(), "devit-media-"));
    const adapter = createLocalCourseMediaStorageAdapter({ rootDirectory });
    const localObjectKey =
      "00000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.png";

    try {
      const result = await adapter.put({
        ownerId: "00000000-0000-4000-8000-000000000001",
        assetId: "11111111-1111-4111-8111-111111111111",
        extension: "png",
        contentType: "image/png",
        bytes: Buffer.from("image-bytes"),
      });

      expect(result).toMatchObject({
        driver: "local",
        publicUrl:
          "/uploads/course-media/00000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.png",
        storageKey:
          "uploads/course-media/00000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.png",
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

  it("stores media in R2-compatible object storage and returns the configured public URL", async () => {
    const puts: Array<Record<string, unknown>> = [];
    const deletes: Array<Record<string, unknown>> = [];
    const adapter = createR2CourseMediaStorageAdapter({
      bucket: "dev4all",
      publicBaseUrl: "https://media.example.dev",
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
      extension: "png",
      contentType: "image/png",
      bytes: Buffer.from("image-bytes"),
    });

    expect(result).toMatchObject({
      driver: "r2",
      publicUrl:
        "https://media.example.dev/uploads/course-media/00000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.png",
      storageKey:
        "uploads/course-media/00000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.png",
    });
    expect(puts).toEqual([
      {
        Bucket: "dev4all",
        Key: result.storageKey,
        Body: Buffer.from("image-bytes"),
        ContentType: "image/png",
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
    expect(() => createCourseMediaStorageAdapter("r2")).toThrow(
      /R2 storage requires R2_BUCKET, R2_PUBLIC_BASE_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY/i,
    );
    expect(() => createCourseMediaStorageAdapter("s3")).toThrow(
      /STORAGE_DRIVER=s3 is configured but no object storage adapter is installed/i,
    );
  });
});
