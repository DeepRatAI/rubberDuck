import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildPostMediaPublicPath,
  isPostMediaPublicPath,
} from "@/lib/post-media";
import { env } from "@/lib/env";
import {
  createCloudflareR2ObjectClient,
  immutableMediaCacheControl,
  type ObjectStorageClient,
} from "./object-storage";

export type PostMediaStorageDriver = "local" | "s3" | "r2" | "supabase";

export type PostMediaStoragePutInput = {
  ownerId: string;
  assetId: string;
  extension: string;
  contentType: string;
  bytes: Uint8Array;
};

export type StoredPostMediaObject = {
  driver: PostMediaStorageDriver;
  publicUrl: string;
  storageKey: string;
  rollback: () => Promise<void>;
};

export type PostMediaStorageAdapter = {
  driver: PostMediaStorageDriver;
  put: (input: PostMediaStoragePutInput) => Promise<StoredPostMediaObject>;
};

type LocalStorageOptions = {
  rootDirectory?: string;
};

type R2StorageOptions = {
  bucket: string;
  publicBaseUrl: string;
  client: ObjectStorageClient;
};

const localStoragePrefix = "uploads/posts/";

function toStorageKey(publicUrl: string) {
  const storageKey = publicUrl.replace(/^\//, "");

  if (
    !isPostMediaPublicPath(publicUrl) ||
    storageKey.includes("..") ||
    !storageKey.startsWith(localStoragePrefix)
  ) {
    throw new Error("Refusing to persist post media to an unsafe path.");
  }

  return storageKey;
}

function buildStorageKey(input: PostMediaStoragePutInput) {
  return toStorageKey(
    buildPostMediaPublicPath({
      ownerId: input.ownerId,
      assetId: input.assetId,
      extension: input.extension,
    }),
  );
}

export function createLocalPostMediaStorageAdapter(
  options: LocalStorageOptions = {},
): PostMediaStorageAdapter {
  const rootDirectory =
    options.rootDirectory ??
    path.join(
      /*turbopackIgnore: true*/ process.cwd(),
      "public",
      "uploads",
      "posts",
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

export function createR2PostMediaStorageAdapter(
  options: R2StorageOptions,
): PostMediaStorageAdapter {
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

function createConfiguredR2PostMediaStorageAdapter() {
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

  return createR2PostMediaStorageAdapter({
    bucket: env.R2_BUCKET,
    publicBaseUrl: env.R2_PUBLIC_BASE_URL,
    client: createCloudflareR2ObjectClient({
      accountId: env.R2_ACCOUNT_ID,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    }),
  });
}

export function createPostMediaStorageAdapter(
  driver: PostMediaStorageDriver,
): PostMediaStorageAdapter {
  if (driver === "local") {
    return createLocalPostMediaStorageAdapter();
  }

  if (driver === "r2") {
    return createConfiguredR2PostMediaStorageAdapter();
  }

  throw new Error(
    `STORAGE_DRIVER=${driver} is configured but no object storage adapter is installed. Set STORAGE_DRIVER=local for local development or add the ${driver} adapter before enabling this mode.`,
  );
}
