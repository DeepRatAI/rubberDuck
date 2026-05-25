import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { courseMediaAssets } from "@/db/schema";
import {
  normalizeCourseMediaMetadata,
  type CourseMediaAsset,
  type CourseMediaKind,
  type CourseMediaMetadata,
} from "@/lib/course-media";

function mapCourseMediaAsset(
  row: typeof courseMediaAssets.$inferSelect,
): CourseMediaAsset {
  return {
    id: row.id,
    ownerId: row.ownerId,
    kind: row.kind as CourseMediaKind,
    originalFileName: row.originalFileName,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    url: row.url,
    altText: row.altText,
    caption: row.caption,
    labels: row.labels,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listCourseMediaAssets(
  ownerId: string,
): Promise<CourseMediaAsset[]> {
  const rows = await db
    .select()
    .from(courseMediaAssets)
    .where(eq(courseMediaAssets.ownerId, ownerId))
    .orderBy(desc(courseMediaAssets.createdAt))
    .limit(40);

  return rows.map(mapCourseMediaAsset);
}

export async function createCourseMediaAsset(input: {
  id: string;
  ownerId: string;
  kind: CourseMediaKind;
  originalFileName: string;
  mimeType: string;
  byteSize: number;
  url: string;
  altText?: string | null;
  caption?: string | null;
  labels?: string[];
}): Promise<CourseMediaAsset> {
  const [asset] = await db.insert(courseMediaAssets).values(input).returning();

  if (!asset) {
    throw new Error("Unable to persist media asset.");
  }

  return mapCourseMediaAsset(asset);
}

export async function listCourseMediaAssetsByUrls(
  ownerId: string,
  urls: string[],
): Promise<CourseMediaAsset[]> {
  const uniqueUrls = [...new Set(urls)];

  if (uniqueUrls.length === 0) {
    return [];
  }

  const rows = await db
    .select()
    .from(courseMediaAssets)
    .where(
      and(
        eq(courseMediaAssets.ownerId, ownerId),
        inArray(courseMediaAssets.url, uniqueUrls),
      ),
    );

  return rows.map(mapCourseMediaAsset);
}

export async function updateCourseMediaAssetMetadata(
  ownerId: string,
  assetId: string,
  input: CourseMediaMetadata,
): Promise<CourseMediaAsset> {
  const metadata = normalizeCourseMediaMetadata(input);
  const [asset] = await db
    .update(courseMediaAssets)
    .set(metadata)
    .where(
      and(
        eq(courseMediaAssets.id, assetId),
        eq(courseMediaAssets.ownerId, ownerId),
      ),
    )
    .returning();

  if (!asset) {
    throw new Error("Media asset not found.");
  }

  return mapCourseMediaAsset(asset);
}
