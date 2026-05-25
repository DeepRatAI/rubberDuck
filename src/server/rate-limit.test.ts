import { describe, expect, it } from "vitest";

import {
  assertRateLimit,
  RateLimitError,
  resetInMemoryRateLimitsForTests,
} from "./rate-limit";

describe("rate limiting", () => {
  it("allows requests up to the configured window limit", async () => {
    resetInMemoryRateLimitsForTests();

    await expect(
      assertRateLimit({
        actorId: "user-1",
        action: "post:create",
        limit: 2,
        windowMs: 60_000,
      }),
    ).resolves.toBeUndefined();

    await expect(
      assertRateLimit({
        actorId: "user-1",
        action: "post:create",
        limit: 2,
        windowMs: 60_000,
      }),
    ).resolves.toBeUndefined();
  });

  it("rejects requests after the configured window limit", async () => {
    resetInMemoryRateLimitsForTests();

    const input = {
      actorId: "user-1",
      action: "post:media",
      limit: 1,
      windowMs: 60_000,
    };

    await assertRateLimit(input);
    await expect(assertRateLimit(input)).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });

  it("isolates limits by action and actor", async () => {
    resetInMemoryRateLimitsForTests();

    await assertRateLimit({
      actorId: "user-1",
      action: "post:create",
      limit: 1,
      windowMs: 60_000,
    });

    await expect(
      assertRateLimit({
        actorId: "user-2",
        action: "post:create",
        limit: 1,
        windowMs: 60_000,
      }),
    ).resolves.toBeUndefined();

    await expect(
      assertRateLimit({
        actorId: "user-1",
        action: "comment:create",
        limit: 1,
        windowMs: 60_000,
      }),
    ).resolves.toBeUndefined();
  });
});
