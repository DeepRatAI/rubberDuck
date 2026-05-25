export const COURSE_MEDIA_MAX_BYTES = 50 * 1024 * 1024;

export type CourseMediaKind = "image" | "video";
export type CourseMediaKindFilter = CourseMediaKind | "all";

export type CourseMediaAsset = {
  id: string;
  ownerId: string;
  kind: CourseMediaKind;
  originalFileName: string;
  mimeType: string;
  byteSize: number;
  url: string;
  altText: string | null;
  caption: string | null;
  labels: readonly string[];
  createdAt: string;
};

export type CourseMediaMetadata = {
  altText: string | null;
  caption: string | null;
  labels: string[];
};

export type CourseMediaAssetFilter = {
  kind?: CourseMediaKindFilter;
  label?: string | null;
  query?: string | null;
};

export type CourseMediaValidation =
  | {
      error: null;
      extension: string;
      kind: CourseMediaKind;
    }
  | {
      error: string;
    };

const courseMediaTypes = {
  "image/avif": { extension: "avif", kind: "image" },
  "image/gif": { extension: "gif", kind: "image" },
  "image/jpeg": { extension: "jpg", kind: "image" },
  "image/png": { extension: "png", kind: "image" },
  "image/webp": { extension: "webp", kind: "image" },
  "video/mp4": { extension: "mp4", kind: "video" },
  "video/webm": { extension: "webm", kind: "video" },
} satisfies Record<string, { extension: string; kind: CourseMediaKind }>;

export const courseMediaPublicPathPattern =
  /^\/uploads\/course-media\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(?:avif|gif|jpe?g|png|webp|mp4|webm)$/;

export function validateCourseMediaFile({
  mimeType,
  byteSize,
}: {
  name: string;
  mimeType: string;
  byteSize: number;
}): CourseMediaValidation {
  if (byteSize <= 0) {
    return { error: "Media file is empty." };
  }

  if (byteSize > COURSE_MEDIA_MAX_BYTES) {
    return { error: "Media file is too large." };
  }

  const mediaType = courseMediaTypes[mimeType as keyof typeof courseMediaTypes];

  if (!mediaType) {
    return { error: "Unsupported media type." };
  }

  return { ...mediaType, error: null };
}

export function buildCourseMediaPublicPath({
  ownerId,
  assetId,
  extension,
}: {
  ownerId: string;
  assetId: string;
  extension: string;
}) {
  return `/uploads/course-media/${ownerId}/${assetId}.${extension}`;
}

export function isCourseMediaPublicPath(value: string) {
  return courseMediaPublicPathPattern.test(value);
}

export function courseMediaKindFromPath(value: string): CourseMediaKind | null {
  if (!isCourseMediaPublicPath(value)) {
    return null;
  }

  return /\.(mp4|webm)$/i.test(value) ? "video" : "image";
}

function normalizeOptionalText(value: string | null | undefined, max: number) {
  const normalized = value?.trim().replace(/\s+/g, " ") ?? "";
  return normalized.length > 0 ? normalized.slice(0, max) : null;
}

function normalizeLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function normalizeCourseMediaLabels(
  labels: readonly string[] | null | undefined,
) {
  const uniqueLabels = new Set<string>();

  for (const label of labels ?? []) {
    const normalized = normalizeLabel(label);

    if (normalized.length > 0) {
      uniqueLabels.add(normalized);
    }

    if (uniqueLabels.size >= 8) {
      break;
    }
  }

  return [...uniqueLabels];
}

export function normalizeCourseMediaMetadata(input: {
  altText?: string | null;
  caption?: string | null;
  labels?: readonly string[] | null;
}): CourseMediaMetadata {
  return {
    altText: normalizeOptionalText(input.altText, 160),
    caption: normalizeOptionalText(input.caption, 240),
    labels: normalizeCourseMediaLabels(input.labels),
  };
}

export function filterCourseMediaAssets<T extends CourseMediaAsset>(
  assets: readonly T[],
  filter: CourseMediaAssetFilter,
) {
  const kind = filter.kind ?? "all";
  const label = filter.label && filter.label !== "all" ? filter.label : null;
  const queryTokens =
    filter.query
      ?.trim()
      .toLocaleLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 0) ?? [];

  return assets.filter((asset) => {
    if (kind !== "all" && asset.kind !== kind) {
      return false;
    }

    if (label && !asset.labels.includes(label)) {
      return false;
    }

    if (queryTokens.length === 0) {
      return true;
    }

    const searchable = [
      asset.originalFileName,
      asset.mimeType,
      asset.altText,
      asset.caption,
      asset.labels.join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();

    return queryTokens.every((token) => searchable.includes(token));
  });
}
