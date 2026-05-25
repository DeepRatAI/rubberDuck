export type AbuseFlag =
  | "unsafe_markup"
  | "unsafe_url_scheme"
  | "excessive_links"
  | "repeated_url"
  | "shortener_cluster"
  | "tag_stuffing";

export type AbuseAssessment = {
  decision: "allow" | "review" | "block";
  flags: AbuseFlag[];
  reasons: string[];
};

const urlPattern = /https?:\/\/[^\s<>"')\]]+/gi;
const unsafePatterns = [
  { flag: "unsafe_markup" as const, pattern: /<\s*script\b/i },
  { flag: "unsafe_markup" as const, pattern: /\son(?:error|load|click)\s*=/i },
  { flag: "unsafe_url_scheme" as const, pattern: /javascript\s*:/i },
  { flag: "unsafe_url_scheme" as const, pattern: /data\s*:\s*text\/html/i },
];
const shortenerHosts = new Set([
  "bit.ly",
  "buff.ly",
  "cutt.ly",
  "is.gd",
  "ow.ly",
  "rebrand.ly",
  "shorturl.at",
  "t.co",
  "tiny.cc",
  "tinyurl.com",
]);

function normalizeUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl.replace(/[.,;:!?]+$/g, ""));
    url.hash = "";
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function extractUrls(value: string) {
  return Array.from(value.matchAll(urlPattern), (match) =>
    normalizeUrl(match[0]),
  );
}

function addFlag(
  flags: Set<AbuseFlag>,
  reasons: string[],
  flag: AbuseFlag,
  reason: string,
) {
  flags.add(flag);
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
}

export function assessUserContent(input: {
  title?: string;
  body: string;
  tags?: readonly string[];
  mediaUrls?: readonly string[];
}): AbuseAssessment {
  const searchable = [
    input.title ?? "",
    input.body,
    ...(input.tags ?? []),
    ...(input.mediaUrls ?? []),
  ].join("\n");
  const flags = new Set<AbuseFlag>();
  const reasons: string[] = [];

  for (const unsafe of unsafePatterns) {
    if (unsafe.pattern.test(searchable)) {
      addFlag(
        flags,
        reasons,
        unsafe.flag,
        "Content contains markup or URL syntax that is unsafe to publish.",
      );
    }
  }

  const urls = [
    ...extractUrls(searchable),
    ...(input.mediaUrls ?? []).map((url) => normalizeUrl(url)),
  ];
  const urlCounts = new Map<string, number>();
  let shortenerCount = 0;

  for (const rawUrl of urls) {
    urlCounts.set(rawUrl, (urlCounts.get(rawUrl) ?? 0) + 1);

    try {
      const host = new URL(rawUrl).hostname.replace(/^www\./, "");
      if (shortenerHosts.has(host)) {
        shortenerCount += 1;
      }
    } catch {
      continue;
    }
  }

  if (urls.length > 12) {
    addFlag(
      flags,
      reasons,
      "excessive_links",
      "Content contains too many links for a single lightweight post.",
    );
  }

  if ([...urlCounts.values()].some((count) => count >= 3)) {
    addFlag(
      flags,
      reasons,
      "repeated_url",
      "The same URL is repeated multiple times.",
    );
  }

  if (shortenerCount >= 3) {
    addFlag(
      flags,
      reasons,
      "shortener_cluster",
      "Content contains a suspicious cluster of shortened links.",
    );
  }

  const uniqueTags = new Set(
    (input.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean),
  );
  if ((input.tags?.length ?? 0) >= 10 && uniqueTags.size <= 3) {
    addFlag(
      flags,
      reasons,
      "tag_stuffing",
      "Tags look duplicated or stuffed.",
    );
  }

  const hardBlockFlags = new Set<AbuseFlag>([
    "unsafe_markup",
    "unsafe_url_scheme",
    "excessive_links",
    "repeated_url",
  ]);
  const decision = [...flags].some((flag) => hardBlockFlags.has(flag))
    ? "block"
    : flags.size > 0
      ? "review"
      : "allow";

  return {
    decision,
    flags: [...flags],
    reasons,
  };
}

export function assertUserContentAcceptable(input: {
  title?: string;
  body: string;
  tags?: readonly string[];
  mediaUrls?: readonly string[];
}) {
  const assessment = assessUserContent(input);

  if (assessment.decision === "block") {
    throw new Error(assessment.reasons[0] ?? "Content could not be published.");
  }

  return assessment;
}
