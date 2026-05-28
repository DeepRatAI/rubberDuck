import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const blockedHostnames = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
]);

function decodeHtmlEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false;
  }

  const [first, second] = parts;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19))
  );
}

function isPrivateIpv6(hostname: string) {
  const normalized = hostname.toLowerCase();

  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

export function isSafeRemoteHttpUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.toLowerCase();

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return false;
    }

    if (blockedHostnames.has(hostname) || hostname.endsWith(".localhost")) {
      return false;
    }

    const ipFamily = isIP(hostname);

    if (ipFamily === 4) {
      return !isPrivateIpv4(hostname);
    }

    if (ipFamily === 6) {
      return !isPrivateIpv6(hostname);
    }

    return true;
  } catch {
    return false;
  }
}

async function canFetchOpenGraphUrl(rawUrl: string) {
  if (!isSafeRemoteHttpUrl(rawUrl)) {
    return false;
  }

  const url = new URL(rawUrl);

  if (isIP(url.hostname)) {
    return true;
  }

  try {
    const addresses = await lookup(url.hostname, { all: true });
    return (
      addresses.length > 0 &&
      addresses.every((address) =>
        isSafeRemoteHttpUrl(`${url.protocol}//${address.address}`),
      )
    );
  } catch {
    return false;
  }
}

function resolveImageUrl(value: string, pageUrl: string) {
  try {
    const resolved = new URL(decodeHtmlEntities(value), pageUrl).toString();
    return isSafeRemoteHttpUrl(resolved) ? resolved : null;
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
    if (!(await canFetchOpenGraphUrl(pageUrl))) {
      return null;
    }

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
