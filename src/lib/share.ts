import { brand } from "./brand";

export type ShareTarget =
  | "x"
  | "reddit"
  | "linkedin"
  | "facebook"
  | "whatsapp"
  | "telegram"
  | "email";

export type SharePayload = {
  url: string;
  title: string;
  description?: string;
  hashtags?: string[];
};

export function createCanonicalUrl(pathOrUrl: string, baseUrl: string) {
  try {
    return new URL(pathOrUrl).toString();
  } catch {
    return new URL(
      pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`,
      baseUrl,
    ).toString();
  }
}

export function normalizeShareDescription(
  value: string | undefined,
  maxLength = 180,
) {
  const normalized = (value ?? brand.description).replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function buildShareText(title: string, description?: string) {
  const normalizedDescription = normalizeShareDescription(description, 120);
  return normalizedDescription ? `${title} - ${normalizedDescription}` : title;
}

export function buildPortableShareText(payload: SharePayload) {
  const text = buildShareText(payload.title, payload.description);
  const rawHashtags = payload.hashtags?.length
    ? payload.hashtags
    : defaultShareHashtags([]);
  const hashtags = rawHashtags
    .map((tag) => tag.replace(/^#/, "").replace(/[^a-zA-Z0-9_]/g, ""))
    .filter(Boolean)
    .slice(0, 6)
    .map((tag) => `#${tag}`)
    .join(" ");

  return [text, payload.url, hashtags].filter(Boolean).join("\n\n");
}

export type ShareDraftTarget = "linkedin" | "x" | "reddit";

export function buildPlatformShareDraft(
  target: ShareDraftTarget,
  payload: SharePayload,
) {
  const description = normalizeShareDescription(payload.description, 220);
  const hashtags = defaultShareHashtags(payload.hashtags ?? [])
    .map((tag) => `#${tag}`)
    .join(" ");

  if (target === "linkedin") {
    return [
      payload.title,
      "",
      description,
      "",
      "Worth discussing with builders who care about open-source learning, runnable technical content, and useful collaboration signals.",
      "",
      payload.url,
      "",
      hashtags,
    ]
      .filter((line) => line !== undefined)
      .join("\n");
  }

  if (target === "reddit") {
    return [
      `${payload.title}`,
      "",
      description,
      "",
      "Context: I found this through RubberDuck, a developer network focused on projects, technical learning, and non-toxic collaboration.",
      "",
      `Link: ${payload.url}`,
      "",
      "What do you think is the strongest technical angle here?",
    ].join("\n");
  }

  return [buildShareText(payload.title, description), payload.url, hashtags]
    .filter(Boolean)
    .join("\n\n");
}

export function createSocialShareUrl(
  target: ShareTarget,
  payload: SharePayload,
) {
  const url = payload.url;
  const title = payload.title;
  const description = normalizeShareDescription(payload.description, 180);
  const text = buildShareText(title, description);
  const params = new URLSearchParams();

  if (target === "x") {
    params.set("url", url);
    params.set("text", text);
    if (payload.hashtags?.length) {
      params.set(
        "hashtags",
        payload.hashtags
          .map((tag) => tag.replace(/^#/, "").replace(/[^a-zA-Z0-9_]/g, ""))
          .filter(Boolean)
          .slice(0, 4)
          .join(","),
      );
    }
    return `https://twitter.com/intent/tweet?${params.toString()}`;
  }

  if (target === "reddit") {
    params.set("url", url);
    params.set("title", title);
    return `https://www.reddit.com/submit?${params.toString()}`;
  }

  if (target === "linkedin") {
    params.set("url", url);
    return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
  }

  if (target === "facebook") {
    params.set("u", url);
    return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
  }

  if (target === "whatsapp") {
    params.set("text", `${text} ${url}`);
    return `https://wa.me/?${params.toString()}`;
  }

  if (target === "telegram") {
    params.set("url", url);
    params.set("text", title);
    return `https://t.me/share/url?${params.toString()}`;
  }

  params.set("subject", title);
  params.set("body", `${text}\n\n${url}`);
  return `mailto:?${params.toString()}`;
}

export function defaultShareHashtags(tags: string[] = []) {
  return ["RubberDuck", ...tags]
    .map((tag) => tag.replace(/^#/, "").replace(/[^a-zA-Z0-9_]/g, ""))
    .filter(Boolean)
    .slice(0, 4);
}
