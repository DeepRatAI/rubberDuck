import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildCourseMediaPublicPath,
  isCourseMediaPublicPath,
} from "@/lib/course-media";
import { env } from "@/lib/env";
import {
  createCloudflareR2ObjectClient,
  immutableMediaCacheControl,
  type ObjectStorageClient,
} from "./object-storage";

export type CourseMediaStorageDriver = "local" | "s3" | "r2" | "supabase";

export type CourseMediaStoragePutInput = {
  ownerId: string;
  assetId: string;
  extension: string;
  contentType: string;
  bytes: Uint8Array;
};

export type StoredCourseMediaObject = {
  driver: CourseMediaStorageDriver;
  publicUrl: string;
  storageKey: string;
  rollback: () => Promise<void>;
};

export type CourseMediaStorageAdapter = {
  driver: CourseMediaStorageDriver;
  put: (input: CourseMediaStoragePutInput) => Promise<StoredCourseMediaObject>;
};

type LocalStorageOptions = {
  rootDirectory?: string;
};

type R2StorageOptions = {
  bucket: string;
  publicBaseUrl: string;
  client: ObjectStorageClient;
};

const localStoragePrefix = "uploads/course-media/";

function toStorageKey(publicUrl: string) {
  const storageKey = publicUrl.replace(/^\//, "");

  if (
    !isCourseMediaPublicPath(publicUrl) ||
    storageKey.includes("..") ||
    !storageKey.startsWith(localStoragePrefix)
  ) {
    throw new Error("Refusing to persist media to an unsafe storage path.");
  }

  return storageKey;
}

export function createLocalCourseMediaStorageAdapter(
  options: LocalStorageOptions = {},
): CourseMediaStorageAdapter {
  const rootDirectory =
    options.rootDirectory ??
    path.join(
      /*turbopackIgnore: true*/ process.cwd(),
      "public",
      "uploads",
      "course-media",
    );

  return {
    driver: "local",
    async put(input) {
      const publicUrl = buildCourseMediaPublicPath({
        ownerId: input.ownerId,
        assetId: input.assetId,
        extension: input.extension,
      });
      const storageKey = toStorageKey(publicUrl);
      const localObjectKey = storageKey.slice(localStoragePrefix.length);
      const storagePath = path.join(
        /*turbopackIgnore: true*/ rootDirectory,
        localObjectKey,
      );

      await mkdir(path.dirname(storagePath), { recursive: true });
      await writeFile(storagePath, input.bytes, { flag: "wx" });

      return {
        driver: "local",
        publicUrl,
        storageKey,
        rollback: () => unlink(storagePath).catch(() => undefined),
      };
    },
  };
}

function buildStorageKey(input: CourseMediaStoragePutInput) {
  return toStorageKey(
    buildCourseMediaPublicPath({
      ownerId: input.ownerId,
      assetId: input.assetId,
      extension: input.extension,
    }),
  );
}

export function createR2CourseMediaStorageAdapter(
  options: R2StorageOptions,
): CourseMediaStorageAdapter {
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

function createConfiguredR2CourseMediaStorageAdapter() {
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

  return createR2CourseMediaStorageAdapter({
    bucket: env.R2_BUCKET,
    publicBaseUrl: env.R2_PUBLIC_BASE_URL,
    client: createCloudflareR2ObjectClient({
      accountId: env.R2_ACCOUNT_ID,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    }),
  });
}

export function createCourseMediaStorageAdapter(
  driver: CourseMediaStorageDriver,
): CourseMediaStorageAdapter {
  if (driver === "local") {
    return createLocalCourseMediaStorageAdapter();
  }

  if (driver === "r2") {
    return createConfiguredR2CourseMediaStorageAdapter();
  }

  throw new Error(
    `STORAGE_DRIVER=${driver} is configured but no object storage adapter is installed. Set STORAGE_DRIVER=local for local development or add the ${driver} adapter before enabling this mode.`,
  );
}
