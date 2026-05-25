import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "@/lib/env";
import {
  buildProfileMediaPublicPath,
  isProfileMediaPublicPath,
  type ProfileMediaKind,
} from "@/lib/profile-media";
import {
  createCloudflareR2ObjectClient,
  immutableMediaCacheControl,
  type ObjectStorageClient,
} from "./object-storage";

export type ProfileMediaStorageDriver = "local" | "s3" | "r2" | "supabase";

export type ProfileMediaStoragePutInput = {
  kind: ProfileMediaKind;
  ownerId: string;
  assetId: string;
  extension: string;
  contentType: string;
  bytes: Uint8Array;
};

export type StoredProfileMediaObject = {
  driver: ProfileMediaStorageDriver;
  publicUrl: string;
  storageKey: string;
  rollback: () => Promise<void>;
};

export type ProfileMediaStorageAdapter = {
  driver: ProfileMediaStorageDriver;
  put: (
    input: ProfileMediaStoragePutInput,
  ) => Promise<StoredProfileMediaObject>;
};

type LocalStorageOptions = {
  rootDirectory?: string;
};

type R2StorageOptions = {
  bucket: string;
  publicBaseUrl: string;
  client: ObjectStorageClient;
};

const localStoragePrefix = "uploads/profile-media/";

function toStorageKey(publicUrl: string) {
  const storageKey = publicUrl.replace(/^\//, "");

  if (
    !isProfileMediaPublicPath(publicUrl) ||
    storageKey.includes("..") ||
    !storageKey.startsWith(localStoragePrefix)
  ) {
    throw new Error("Refusing to persist profile media to an unsafe path.");
  }

  return storageKey;
}

function buildStorageKey(input: ProfileMediaStoragePutInput) {
  return toStorageKey(
    buildProfileMediaPublicPath({
      kind: input.kind,
      ownerId: input.ownerId,
      assetId: input.assetId,
      extension: input.extension,
    }),
  );
}

export function createLocalProfileMediaStorageAdapter(
  options: LocalStorageOptions = {},
): ProfileMediaStorageAdapter {
  const rootDirectory =
    options.rootDirectory ??
    path.join(
      /*turbopackIgnore: true*/ process.cwd(),
      "public",
      "uploads",
      "profile-media",
    );

  return {
    driver: "local",
    async put(input) {
      const storageKey = buildStorageKey(input);
      const localObjectKey = storageKey.slice(localStoragePrefix.length);
      const storagePath = path.join(
        /*turbopackIgnore: true*/ rootDirectory,
        localObjectKey,
      );

      await mkdir(path.dirname(storagePath), { recursive: true });
      await writeFile(storagePath, input.bytes, { flag: "wx" });

      return {
        driver: "local",
        publicUrl: `/${storageKey}`,
        storageKey,
        rollback: () => unlink(storagePath).catch(() => undefined),
      };
    },
  };
}

export function createR2ProfileMediaStorageAdapter(
  options: R2StorageOptions,
): ProfileMediaStorageAdapter {
  const publicBaseUrl = options.publicBaseUrl.replace(/\/+$/, "");

  return {
    driver: "r2",
    async put(input) {
      const storageKey = buildStorageKey(input);

      await options.client.putObject({
        Bucket: options.bucket,
        Key: storageKey,
        Body: input.bytes,
        ContentType: input.contentType,
        CacheControl: immutableMediaCacheControl,
      });

      return {
        driver: "r2",
        publicUrl: `${publicBaseUrl}/${storageKey}`,
        storageKey,
        rollback: () =>
          options.client
            .deleteObject({ Bucket: options.bucket, Key: storageKey })
            .catch(() => undefined),
      };
    },
  };
}

function createConfiguredR2ProfileMediaStorageAdapter() {
  if (
    !env.R2_BUCKET ||
    !env.R2_PUBLIC_BASE_URL ||
    !env.R2_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY
  ) {
    throw new Error(
      "R2 storage requires R2_BUCKET, R2_PUBLIC_BASE_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.",
    );
  }

  return createR2ProfileMediaStorageAdapter({
    bucket: env.R2_BUCKET,
    publicBaseUrl: env.R2_PUBLIC_BASE_URL,
    client: createCloudflareR2ObjectClient({
      accountId: env.R2_ACCOUNT_ID,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    }),
  });
}

export function createProfileMediaStorageAdapter(
  driver: ProfileMediaStorageDriver,
): ProfileMediaStorageAdapter {
  if (driver === "local") {
    return createLocalProfileMediaStorageAdapter();
  }

  if (driver === "r2") {
    return createConfiguredR2ProfileMediaStorageAdapter();
  }

  throw new Error(
    `STORAGE_DRIVER=${driver} is configured but no profile media adapter is installed. Set STORAGE_DRIVER=local for local development or add the ${driver} adapter before enabling this mode.`,
  );
}
