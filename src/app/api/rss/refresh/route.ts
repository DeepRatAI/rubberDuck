import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import Parser from "rss-parser";

import { db } from "@/db";
import { rssItems, rssSources } from "@/db/schema";
import { env } from "@/lib/env";
import { hasRssRefreshAccess } from "@/lib/rss-refresh-auth";
import { fetchOpenGraphImage, isSafeRemoteHttpUrl } from "@/lib/rss-images";
import { curatedRssSources } from "@/lib/rss-sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RssItemWithMedia = Parser.Item & {
  enclosure?: { url?: string; type?: string };
  "media:content"?: { $?: { url?: string; medium?: string; type?: string } };
  "media:thumbnail"?: { $?: { url?: string } };
  "itunes:image"?: { href?: string };
};

function extractImageUrl(item: RssItemWithMedia) {
  const imageUrl =
    (item.enclosure?.type?.startsWith("image/")
      ? item.enclosure.url
      : undefined) ??
    item["media:thumbnail"]?.$?.url ??
    item["media:content"]?.$?.url ??
    item["itunes:image"]?.href ??
    null;

  return imageUrl && isSafeRemoteHttpUrl(imageUrl) ? imageUrl : null;
}

function hasRefreshAccess(request: NextRequest) {
  return hasRssRefreshAccess(
    {
      headerSecret: request.headers.get("x-rubberduck-rss-secret"),
      legacyHeaderSecret: request.headers.get("x-devit-rss-secret"),
      authorization: request.headers.get("authorization"),
      querySecret: request.nextUrl.searchParams.get("secret"),
    },
    {
      cronSecret: env.CRON_SECRET,
      refreshSecret: env.RSS_REFRESH_SECRET,
    },
  );
}

function isSpecificArticleUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      return false;
    }
    if (
      segments.length === 1 &&
      ["blog", "news", "changelog", "articles"].includes(segments[0] ?? "")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function parseSourceFeed(
  parser: Parser<unknown, RssItemWithMedia>,
  url: string,
) {
  const response = await fetch(url, {
    headers: {
      accept:
        "application/rss+xml, application/atom+xml, application/xml, text/xml",
      "user-agent": "rubberduck-rss-refresh/0.1 (+https://rubberduck.net)",
    },
    signal: AbortSignal.timeout(6000),
  });

  if (!response.ok) {
    throw new Error(`RSS source returned ${response.status}`);
  }

  return parser.parseString(await response.text());
}

function parsePublishedAt(value: string | undefined) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : new Date();
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R | null>,
) {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;

      if (!item) {
        continue;
      }

      const result = await mapper(item);
      if (result) {
        results.push(result);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}

async function refreshRssItems() {
  await db
    .insert(rssSources)
    .values(
      curatedRssSources.map((source) => ({
        name: source.name,
        url: source.url,
        enabled: true,
      })),
    )
    .onConflictDoUpdate({
      target: rssSources.url,
      set: {
        enabled: true,
      },
    });

  const sourceRows = await db
    .select()
    .from(rssSources)
    .where(eq(rssSources.enabled, true));

  const parser = new Parser<unknown, RssItemWithMedia>({
    customFields: {
      item: ["media:content", "media:thumbnail", "itunes:image"],
    },
  });
  const feeds = await Promise.allSettled(
    sourceRows.map((source) => parseSourceFeed(parser, source.url)),
  );
  const failures: Array<{ source: string; reason: string }> = [];
  const candidates: Array<{
    source: (typeof sourceRows)[number];
    item: RssItemWithMedia & { title: string; link: string };
  }> = [];

  for (const [index, result] of feeds.entries()) {
    const source = sourceRows[index];
    if (!source) {
      continue;
    }

    if (result.status !== "fulfilled") {
      failures.push({
        source: source.name,
        reason:
          result.reason instanceof Error
            ? result.reason.message.slice(0, 160)
            : "RSS source failed.",
      });
      continue;
    }

    for (const item of result.value.items.slice(0, 8)) {
      if (
        !item.title ||
        !item.link ||
        !isSpecificArticleUrl(item.link) ||
        !isSafeRemoteHttpUrl(item.link)
      ) {
        continue;
      }

      candidates.push({
        source,
        item: { ...item, title: item.title, link: item.link },
      });
    }
  }

  const items = await mapWithConcurrency(
    candidates,
    12,
    async ({ source, item }) => {
      const publishedAt = item.isoDate ?? item.pubDate;
      const sourceImageUrl =
        extractImageUrl(item) ?? (await fetchOpenGraphImage(item.link));
      return {
        sourceId: source.id,
        title: item.title.slice(0, 240),
        summary: (item.contentSnippet ?? item.content ?? item.title)
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 700),
        url: item.link,
        imageUrl: sourceImageUrl,
        tags: [source.name.toLowerCase().replace(/\s+/g, "-"), "rss"],
        publishedAt: parsePublishedAt(publishedAt),
      };
    },
  );

  for (const normalized of items) {
    await db
      .insert(rssItems)
      .values(normalized)
      .onConflictDoUpdate({
        target: rssItems.url,
        set: {
          title: normalized.title,
          summary: normalized.summary,
          imageUrl: normalized.imageUrl,
          tags: normalized.tags,
          publishedAt: normalized.publishedAt,
        },
      });
  }

  return NextResponse.json({
    refreshedAt: new Date().toISOString(),
    count: items.length,
    sources: sourceRows.length,
    failedSources: failures.length,
    failures,
    items,
  });
}

export async function POST(request: NextRequest) {
  if (!hasRefreshAccess(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return refreshRssItems();
}

export async function GET(request: NextRequest) {
  if (!hasRefreshAccess(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return refreshRssItems();
}
