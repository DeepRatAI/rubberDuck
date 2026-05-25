import { describe, expect, it } from "vitest";

import { verifyTurnstileToken } from "./turnstile";

describe("Turnstile verification", () => {
  it("bypasses verification in local development when no secret is configured", async () => {
    await expect(
      verifyTurnstileToken({
        token: null,
        secretKey: undefined,
        nodeEnv: "development",
      }),
    ).resolves.toMatchObject({ success: true, skipped: true });
  });

  it("fails closed in production when no secret is configured", async () => {
    await expect(
      verifyTurnstileToken({
        token: "client-token",
        secretKey: undefined,
        nodeEnv: "production",
      }),
    ).resolves.toMatchObject({
      success: false,
      errorCodes: ["turnstile-not-configured"],
    });
  });

  it("validates a client token through Cloudflare Siteverify", async () => {
    const requests: unknown[] = [];
    const result = await verifyTurnstileToken({
      token: "client-token",
      secretKey: "server-secret",
      remoteIp: "203.0.113.10",
      idempotencyKey: "validation-id",
      fetcher: async (_url, init) => {
        requests.push(JSON.parse(String(init?.body)));
        return Response.json({
          success: true,
          challenge_ts: "2026-05-10T00:00:00Z",
        });
      },
    });

    expect(result).toEqual({ success: true, skipped: false, errorCodes: [] });
    expect(requests).toEqual([
      {
        secret: "server-secret",
        response: "client-token",
        remoteip: "203.0.113.10",
        idempotency_key: "validation-id",
      },
    ]);
  });
});
