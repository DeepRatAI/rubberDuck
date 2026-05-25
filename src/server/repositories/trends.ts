import { and, desc, eq, gte } from "drizzle-orm";

import { db } from "@/db";
import { rssItems, rssSources } from "@/db/schema";
import { curatedRssSources } from "@/lib/rss-sources";
import { buildExternalTrends } from "@/lib/trends";

const curatedTagsByUrl = new Map(
  curatedRssSources.map((source) => [source.url, source.tags]),
);

export async function listExternalTrends({
  now = new Date(),
  limit = 5,
}: {
  now?: Date;
  limit?: number;
} = {}) {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      title: rssItems.title,
      summary: rssItems.summary,
      url: rssItems.url,
      tags: rssItems.tags,
      publishedAt: rssItems.publishedAt,
      sourceName: rssSources.name,
      sourceUrl: rssSources.url,
    })
    .from(rssItems)
    .innerJoin(rssSources, eq(rssItems.sourceId, rssSources.id))
    .where(and(eq(rssSources.enabled, true), gte(rssItems.publishedAt, sevenDaysAgo)))
    .orderBy(desc(rssItems.publishedAt))
    .limit(1000);

  return buildExternalTrends(
    rows.map((row) => ({
      title: row.title,
      summary: row.summary,
      url: row.url,
      sourceName: row.sourceName,
      tags: Array.from(
        new Set([
          ...row.tags,
          ...(curatedTagsByUrl.get(row.sourceUrl) ?? []),
        ]),
      ),
      publishedAt: row.publishedAt,
    })),
    { now, limit },
  );
}
