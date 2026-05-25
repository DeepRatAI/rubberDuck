import { randomUUID } from "node:crypto";

import { validateCourseMediaFile } from "@/lib/course-media";
import { env } from "@/lib/env";
import { createCourseMediaStorageAdapter } from "./course-media-storage-adapter";
import { createCourseMediaAsset } from "./repositories/media";

function trimFileName(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 240) : "uploaded-media";
}

export async function persistCourseMediaUpload(userId: string, file: File) {
  const validation = validateCourseMediaFile({
    name: file.name,
    mimeType: file.type,
    byteSize: file.size,
  });

  if (validation.error !== null) {
    throw new Error(validation.error);
  }

  const assetId = randomUUID();
  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = createCourseMediaStorageAdapter(env.STORAGE_DRIVER);
  const storedObject = await storage.put({
    ownerId: userId,
    assetId,
    extension: validation.extension,
    contentType: file.type,
    bytes: buffer,
  });

  try {
    return await createCourseMediaAsset({
      id: assetId,
      ownerId: userId,
      kind: validation.kind,
      originalFileName: trimFileName(file.name),
      mimeType: file.type,
      byteSize: file.size,
      url: storedObject.publicUrl,
      altText: null,
      caption: null,
      labels: [],
    });
  } catch (error) {
    await storedObject.rollback();
    throw error;
  }
}
