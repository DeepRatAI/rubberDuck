import { randomUUID } from "node:crypto";

import { env } from "@/lib/env";
import {
  validateProfileMediaFile,
  type ProfileMediaKind,
} from "@/lib/profile-media";
import { createProfileMediaStorageAdapter } from "./profile-media-storage-adapter";

export type PersistedProfileMedia = {
  kind: ProfileMediaKind;
  url: string;
  storageKey: string;
};

export async function persistProfileMediaUpload(
  userId: string,
  kind: ProfileMediaKind,
  file: File,
): Promise<PersistedProfileMedia> {
  const validation = validateProfileMediaFile({
    fileName: file.name,
    mimeType: file.type,
    byteSize: file.size,
  });

  if (validation.error !== null) {
    throw new Error(validation.error);
  }

  const storage = createProfileMediaStorageAdapter(env.STORAGE_DRIVER);
  const storedObject = await storage.put({
    kind,
    ownerId: userId,
    assetId: randomUUID(),
    extension: validation.extension,
    contentType: file.type,
    bytes: Buffer.from(await file.arrayBuffer()),
  });

  return {
    kind,
    url: storedObject.publicUrl,
    storageKey: storedObject.storageKey,
  };
}
