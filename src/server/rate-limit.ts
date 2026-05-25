import { env } from "@/lib/env";

type RateLimitInput = {
  actorId: string;
  action: string;
  limit: number;
  windowMs: number;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitState>;

const globalForRateLimit = globalThis as typeof globalThis & {
  __rubberduckRateLimitStore?: RateLimitStore;
};

const memoryStore =
  globalForRateLimit.__rubberduckRateLimitStore ?? new Map<string, RateLimitState>();

if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.__rubberduckRateLimitStore = memoryStore;
}

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function nowBucket(windowMs: number) {
  return Math.floor(Date.now() / windowMs);
}

function retryAfter(resetAt: number) {
  return Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
}

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9:._-]/g, "_").slice(0, 160);
}

function rateLimitKey(input: RateLimitInput) {
  return [
    "rubberduck",
    "rl",
    sanitizeSegment(input.action),
    sanitizeSegment(input.actorId),
    nowBucket(input.windowMs),
  ].join(":");
}

async function upstashCommand<T>(command: readonly string[]): Promise<T> {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error("Upstash Redis REST is not configured.");
  }

  const endpoint = `${env.UPSTASH_REDIS_REST_URL.replace(/\/+$/, "")}/${command
    .map((part) => encodeURIComponent(part))
    .join("/")}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash rate limit command failed: ${response.status}`);
  }

  const payload = (await response.json()) as { result?: T; error?: string };

  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload.result as T;
}

async function assertUpstashLimit(input: RateLimitInput) {
  const key = rateLimitKey(input);
  const count = Number(await upstashCommand<number>(["incr", key]));

  if (count === 1) {
    await upstashCommand<number>([
      "expire",
      key,
      String(Math.ceil(input.windowMs / 1000) + 5),
    ]);
  }

  if (count > input.limit) {
    const resetAt = (nowBucket(input.windowMs) + 1) * input.windowMs;
    throw new RateLimitError(
      "Too many requests. Please wait before trying again.",
      retryAfter(resetAt),
    );
  }
}

function assertMemoryLimit(input: RateLimitInput) {
  const key = rateLimitKey(input);
  const current = memoryStore.get(key);
  const resetAt = (nowBucket(input.windowMs) + 1) * input.windowMs;

  if (!current || current.resetAt <= Date.now()) {
    memoryStore.set(key, { count: 1, resetAt });
    return;
  }

  current.count += 1;

  if (current.count > input.limit) {
    throw new RateLimitError(
      "Too many requests. Please wait before trying again.",
      retryAfter(current.resetAt),
    );
  }
}

export async function assertRateLimit(input: RateLimitInput) {
  const effectiveInput =
    process.env.NODE_ENV === "development"
      ? { ...input, limit: input.limit * 100 }
      : input;

  if (
    process.env.NODE_ENV !== "test" &&
    env.UPSTASH_REDIS_REST_URL &&
    env.UPSTASH_REDIS_REST_TOKEN
  ) {
    try {
      await assertUpstashLimit(effectiveInput);
      return;
    } catch (error) {
      if (process.env.NODE_ENV === "production") {
        throw error;
      }
    }
  }

  assertMemoryLimit(effectiveInput);
}

export function resetInMemoryRateLimitsForTests() {
  memoryStore.clear();
}
