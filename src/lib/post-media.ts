export const POST_MEDIA_MAX_BYTES = 25 * 1024 * 1024;

export type PostMediaKind = "image" | "video";

export const postMediaMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
] as const;

export type PostMediaMimeType = (typeof postMediaMimeTypes)[number];

export type PostMediaValidation =
  | {
      error: null;
      extension: string;
      kind: PostMediaKind;
    }
  | {
      error: string;
    };

const postMediaTypes = {
  "image/jpeg": { extension: "jpg", kind: "image" },
  "image/png": { extension: "png", kind: "image" },
  "image/webp": { extension: "webp", kind: "image" },
  "image/gif": { extension: "gif", kind: "image" },
  "video/mp4": { extension: "mp4", kind: "video" },
  "video/webm": { extension: "webm", kind: "video" },
} satisfies Record<PostMediaMimeType, { extension: string; kind: PostMediaKind }>;

export const postMediaPublicPathPattern =
  /^\/uploads\/posts\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(?:gif|jpe?g|png|webp|mp4|webm)$/;

export function validatePostMediaFile({
  mimeType,
  byteSize,
}: {
  fileName: string;
  mimeType: string;
  byteSize: number;
}): PostMediaValidation {
  if (byteSize <= 0) {
    return { error: "Media file is empty." };
  }

  if (byteSize > POST_MEDIA_MAX_BYTES) {
    return { error: "Media file is too large." };
  }

  const mediaType = postMediaTypes[mimeType as PostMediaMimeType];

  if (!mediaType) {
    return { error: "Unsupported media type." };
  }

  return { ...mediaType, error: null };
}

export function buildPostMediaPublicPath({
  ownerId,
  assetId,
  extension,
}: {
  ownerId: string;
  assetId: string;
  extension: string;
}) {
  return `/uploads/posts/${ownerId}/${assetId}.${extension}`;
}

export function isPostMediaPublicPath(value: string) {
  return postMediaPublicPathPattern.test(value);
}
