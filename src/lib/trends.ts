import type { TrendTopic, TrendWindow } from "./domain";

export type TrendInputItem = {
  title: string;
  summary?: string;
  url: string;
  sourceName: string;
  tags: string[];
  publishedAt: Date;
};

type Candidate = {
  label: string;
  weight: number;
};

const stopWords = new Set([
  "about",
  "after",
  "again",
  "with",
  "from",
  "into",
  "over",
  "under",
  "using",
  "use",
  "uses",
  "used",
  "this",
  "that",
  "these",
  "those",
  "their",
  "your",
  "ours",
  "what",
  "when",
  "where",
  "which",
  "while",
  "why",
  "how",
  "new",
  "now",
  "all",
  "for",
  "and",
  "the",
  "a",
  "an",
  "to",
  "of",
  "in",
  "on",
  "by",
  "is",
  "are",
  "as",
  "at",
  "or",
  "be",
  "it",
]);

const aliasDictionary: Array<{ label: string; patterns: string[] }> = [
  { label: "AI agents", patterns: ["agentic", "ai agent", "agents", " agent "] },
  { label: "OpenAI", patterns: ["openai", "codex", "gpt"] },
  { label: "LLMs", patterns: ["llm", "large language model", "language model"] },
  { label: "Machine learning", patterns: ["machine learning", "ml "] },
  { label: "Postgres", patterns: ["postgres", "postgresql"] },
  { label: "WebGPU", patterns: ["webgpu"] },
  { label: "React", patterns: ["react"] },
  { label: "Next.js", patterns: ["next.js", "nextjs"] },
  { label: "TypeScript", patterns: ["typescript"] },
  { label: "Python", patterns: ["python"] },
  { label: "Rust", patterns: ["rust"] },
  { label: "Kubernetes", patterns: ["kubernetes", "k8s"] },
  { label: "Docker", patterns: ["docker", "containers"] },
  { label: "Observability", patterns: ["observability", "tracing", "telemetry"] },
  { label: "Security", patterns: ["security", "vulnerability", "hardening"] },
  { label: "Cloudflare", patterns: ["cloudflare"] },
  { label: "GitHub", patterns: ["github"] },
  { label: "Hugging Face", patterns: ["hugging face", "huggingface"] },
  { label: "Open source", patterns: ["open source", "open-source", "oss"] },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCaseTag(value: string) {
  const normalized = value.replace(/[-_]+/g, " ").trim();
  const alias = aliasDictionary.find((entry) =>
    entry.patterns.includes(normalized.toLowerCase()),
  );

  if (alias) {
    return alias.label;
  }

  return normalized
    .split(/\s+/)
    .map((part) =>
      part.length <= 3 && part === part.toLowerCase()
        ? part.toUpperCase()
        : `${part.charAt(0).toUpperCase()}${part.slice(1)}`,
    )
    .join(" ");
}

function addCandidate(
  candidates: Map<string, Candidate>,
  label: string,
  weight: number,
) {
  const clean = label.replace(/\s+/g, " ").trim();
  const slug = slugify(clean);

  if (!clean || !slug || stopWords.has(clean.toLowerCase())) {
    return;
  }

  const existing = candidates.get(slug);
  if (!existing || existing.weight < weight) {
    candidates.set(slug, { label: clean, weight });
  }
}

function extractCandidates(item: TrendInputItem) {
  const candidates = new Map<string, Candidate>();
  const text = `${item.title} ${item.summary ?? ""}`;
  const lowerText = ` ${text.toLowerCase()} `;

  for (const tag of item.tags) {
    if (tag.toLowerCase() === "rss") {
      continue;
    }
    addCandidate(candidates, titleCaseTag(tag), 4);
  }

  for (const alias of aliasDictionary) {
    if (alias.patterns.some((pattern) => lowerText.includes(pattern))) {
      addCandidate(candidates, alias.label, 5);
    }
  }

  const namedPhrases =
    text.match(/\b[A-Z][A-Za-z0-9.+#-]*(?:\s+[A-Z][A-Za-z0-9.+#-]*){0,2}\b/g) ??
    [];
  for (const phrase of namedPhrases) {
    const clean = phrase.trim();
    if (clean.length >= 3 && !/^(The|This|That|How|Why|What|When)$/.test(clean)) {
      addCandidate(candidates, clean, 3);
    }
  }

  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^-+|-+$/g, ""))
    .filter((token) => token.length > 2 && !stopWords.has(token));

  for (const token of tokens) {
    if (/\\d/.test(token) || token.length > 18) {
      continue;
    }
    addCandidate(candidates, titleCaseTag(token), 1);
  }

  return Array.from(candidates.values()).slice(0, 12);
}

function recencyWeight(publishedAt: Date, now: Date) {
  const ageHours = Math.max(
    0,
    (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60),
  );

  return Math.max(0.35, 1 - ageHours / (24 * 7));
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function buildExternalTrends(
  items: TrendInputItem[],
  {
    now = new Date(),
    limit = 5,
    minimumTodayItems = 3,
  }: {
    now?: Date;
    limit?: number;
    minimumTodayItems?: number;
  } = {},
): TrendTopic[] {
  const todayStart = startOfUtcDay(now);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const eligible = items.filter((item) => item.publishedAt <= now);
  const todayItems = eligible.filter((item) => item.publishedAt >= todayStart);
  const window: TrendWindow =
    todayItems.length >= minimumTodayItems ? "today" : "recent";
  const scoped =
    window === "today"
      ? todayItems
      : eligible.filter((item) => item.publishedAt >= sevenDaysAgo);

  const scored = new Map<
    string,
    {
      label: string;
      score: number;
      articleUrls: Set<string>;
      sources: Set<string>;
      latest?: TrendInputItem;
    }
  >();

  for (const item of scoped) {
    for (const candidate of extractCandidates(item)) {
      const slug = slugify(candidate.label);
      const current =
        scored.get(slug) ??
        ({
          label: candidate.label,
          score: 0,
          articleUrls: new Set<string>(),
          sources: new Set<string>(),
        } satisfies NonNullable<ReturnType<typeof scored.get>>);
      current.score += candidate.weight * recencyWeight(item.publishedAt, now);
      current.articleUrls.add(item.url);
      current.sources.add(item.sourceName);
      if (!current.latest || item.publishedAt > current.latest.publishedAt) {
        current.latest = item;
      }
      scored.set(slug, current);
    }
  }

  return Array.from(scored.entries())
    .map(([slug, trend]) => ({
      label: trend.label,
      slug,
      articleCount: trend.articleUrls.size,
      sourceCount: trend.sources.size,
      score:
        Math.round(
          (trend.score + trend.sources.size * 1.5 + trend.articleUrls.size) *
            100,
        ) / 100,
      window,
      latestTitle: trend.latest?.title,
      latestUrl: trend.latest?.url,
    }))
    .filter((trend) => trend.articleCount > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.sourceCount !== a.sourceCount) {
        return b.sourceCount - a.sourceCount;
      }
      return b.articleCount - a.articleCount;
    })
    .slice(0, limit);
}
