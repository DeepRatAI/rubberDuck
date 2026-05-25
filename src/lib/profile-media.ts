export const PROFILE_MEDIA_MAX_BYTES = 8 * 1024 * 1024;

export type ProfileMediaKind = "avatar" | "banner";

export const profileMediaMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type ProfileMediaMimeType = (typeof profileMediaMimeTypes)[number];

export type ProfileMediaValidation =
  | {
      error: null;
      extension: string;
    }
  | {
      error: string;
    };

const profileMediaTypes = {
  "image/jpeg": { extension: "jpg" },
  "image/png": { extension: "png" },
  "image/webp": { extension: "webp" },
  "image/gif": { extension: "gif" },
} satisfies Record<ProfileMediaMimeType, { extension: string }>;

export const profileMediaPublicPathPattern =
  /^\/uploads\/profile-media\/(?:avatar|banner)\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(?:gif|jpe?g|png|webp)$/;

export function validateProfileMediaFile({
  mimeType,
  byteSize,
}: {
  fileName: string;
  mimeType: string;
  byteSize: number;
}): ProfileMediaValidation {
  if (byteSize <= 0) {
    return { error: "Profile image is empty." };
  }

  if (byteSize > PROFILE_MEDIA_MAX_BYTES) {
    return { error: "Profile image is too large." };
  }

  const mediaType = profileMediaTypes[mimeType as ProfileMediaMimeType];

  if (!mediaType) {
    return { error: "Unsupported profile image type." };
  }

  return { ...mediaType, error: null };
}

export function buildProfileMediaPublicPath({
  kind,
  ownerId,
  assetId,
  extension,
}: {
  kind: ProfileMediaKind;
  ownerId: string;
  assetId: string;
  extension: string;
}) {
  return `/uploads/profile-media/${kind}/${ownerId}/${assetId}.${extension}`;
}

export function isProfileMediaPublicPath(value: string) {
  return profileMediaPublicPathPattern.test(value);
}
