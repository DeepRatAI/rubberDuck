function decodeHtmlEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function resolveImageUrl(value: string, pageUrl: string) {
  try {
    return new URL(decodeHtmlEntities(value), pageUrl).toString();
  } catch {
    return null;
  }
}

export function extractOpenGraphImage(html: string, pageUrl: string) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const imageProperties = new Set([
    "og:image",
    "og:image:url",
    "twitter:image",
    "twitter:image:src",
  ]);

  for (const tag of metaTags) {
    const property =
      tag.match(/\b(?:property|name)=["']([^"']+)["']/i)?.[1]?.trim() ?? "";

    if (!imageProperties.has(property.toLowerCase())) {
      continue;
    }

    const content = tag.match(/\bcontent=["']([^"']+)["']/i)?.[1]?.trim();
    if (!content) {
      continue;
    }

    const resolved = resolveImageUrl(content, pageUrl);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

export async function fetchOpenGraphImage(pageUrl: string) {
  try {
    const response = await fetch(pageUrl, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "rubberduck-rss-refresh/0.1 (+https://rubberduck.net)",
      },
      signal: AbortSignal.timeout(3500),
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return null;
    }

    const html = await response.text();
    return extractOpenGraphImage(html.slice(0, 150_000), pageUrl);
  } catch {
    return null;
  }
}
