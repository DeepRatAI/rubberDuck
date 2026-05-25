import { desc, inArray } from "drizzle-orm";

import { db } from "@/db";
import { rssItems, rssSources } from "@/db/schema";

export type RssSourceHealth = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  itemCount: number;
  latestItemAt: string | null;
  latestItemTitle: string | null;
  latestItemUrl: string | null;
};

export async function listRssSourceHealth(): Promise<RssSourceHealth[]> {
  const sourceRows = await db
    .select({
      id: rssSources.id,
      name: rssSources.name,
      url: rssSources.url,
      enabled: rssSources.enabled,
    })
    .from(rssSources);

  if (sourceRows.length === 0) {
    return [];
  }

  const itemRows = await db
    .select({
      sourceId: rssItems.sourceId,
      title: rssItems.title,
      url: rssItems.url,
      publishedAt: rssItems.publishedAt,
    })
    .from(rssItems)
    .where(
      inArray(
        rssItems.sourceId,
        sourceRows.map((source) => source.id),
      ),
    )
    .orderBy(desc(rssItems.publishedAt));

  const itemsBySource = new Map<string, typeof itemRows>();

  for (const item of itemRows) {
    itemsBySource.set(item.sourceId, [
      ...(itemsBySource.get(item.sourceId) ?? []),
      item,
    ]);
  }

  return sourceRows
    .map((source) => {
      const items = itemsBySource.get(source.id) ?? [];
      const latest = items[0];

      return {
        id: source.id,
        name: source.name,
        url: source.url,
        enabled: source.enabled,
        itemCount: items.length,
        latestItemAt: latest?.publishedAt.toISOString() ?? null,
        latestItemTitle: latest?.title ?? null,
        latestItemUrl: latest?.url ?? null,
      };
    })
    .sort((first, second) => {
      if (first.enabled !== second.enabled) {
        return first.enabled ? -1 : 1;
      }

      return first.name.localeCompare(second.name);
    });
}

export function summarizeRssHealth(sources: RssSourceHealth[]) {
  const staleCutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const staleSources = sources.filter((source) => {
    if (!source.enabled) {
      return false;
    }

    if (!source.latestItemAt) {
      return true;
    }

    return Date.parse(source.latestItemAt) < staleCutoff;
  });

  return {
    sources: sources.length,
    enabled: sources.filter((source) => source.enabled).length,
    totalItems: sources.reduce((total, source) => total + source.itemCount, 0),
    staleSources: staleSources.length,
  };
}
