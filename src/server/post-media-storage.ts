import { randomUUID } from "node:crypto";

import type { PostMedia } from "@/lib/domain";
import { env } from "@/lib/env";
import { validatePostMediaFile } from "@/lib/post-media";
import { createPostMediaStorageAdapter } from "./post-media-storage-adapter";

export async function persistPostMediaUpload(
  userId: string,
  file: File,
): Promise<PostMedia> {
  const validation = validatePostMediaFile({
    fileName: file.name,
    mimeType: file.type,
    byteSize: file.size,
  });

  if (validation.error !== null) {
    throw new Error(validation.error);
  }

  const storage = createPostMediaStorageAdapter(env.STORAGE_DRIVER);
  const storedObject = await storage.put({
    ownerId: userId,
    assetId: randomUUID(),
    extension: validation.extension,
    contentType: file.type,
    bytes: Buffer.from(await file.arrayBuffer()),
  });

  return {
    type: validation.kind,
    url: storedObject.publicUrl,
    title: file.name,
    provider: storedObject.driver === "local" ? "local" : "external",
  };
}
