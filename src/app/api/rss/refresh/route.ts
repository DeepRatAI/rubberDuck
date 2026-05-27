import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import Parser from "rss-parser";

import { db } from "@/db";
import { rssItems, rssSources } from "@/db/schema";
import { env } from "@/lib/env";
import { fetchOpenGraphImage } from "@/lib/rss-images";
import { curatedRssSources } from "@/lib/rss-sources";

type RssItemWithMedia = Parser.Item & {
  enclosure?: { url?: string; type?: string };
  "media:content"?: { $?: { url?: string; medium?: string; type?: string } };
  "media:thumbnail"?: { $?: { url?: string } };
  "itunes:image"?: { href?: string };
};

function extractImageUrl(item: RssItemWithMedia) {
  return (
    (item.enclosure?.type?.startsWith("image/")
      ? item.enclosure.url
      : undefined) ??
    item["media:thumbnail"]?.$?.url ??
    item["media:content"]?.$?.url ??
    item["itunes:image"]?.href ??
    null
  );
}

function hasRefreshAccess(request: NextRequest) {
  const secret =
    request.headers.get("x-rubberduck-rss-secret") ??
    request.headers.get("x-devit-rss-secret");
  const bearerToken = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  const querySecret = request.nextUrl.searchParams.get("secret");
  return (
    secret === env.RSS_REFRESH_SECRET ||
    bearerToken === env.RSS_REFRESH_SECRET ||
    querySecret === env.RSS_REFRESH_SECRET
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
  const items = [];

  for (const [index, result] of feeds.entries()) {
    const source = sourceRows[index];
    if (!source || result.status !== "fulfilled") {
      continue;
    }

    for (const item of result.value.items.slice(0, 8)) {
      if (!item.title || !item.link || !isSpecificArticleUrl(item.link)) {
        continue;
      }

      const publishedAt = item.isoDate ?? item.pubDate;
      const sourceImageUrl =
        extractImageUrl(item) ?? (await fetchOpenGraphImage(item.link));
      const normalized = {
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
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      };

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
      items.push(normalized);
    }
  }

  return NextResponse.json({
    refreshedAt: new Date().toISOString(),
    count: items.length,
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
