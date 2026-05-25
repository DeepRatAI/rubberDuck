const siteverifyUrl =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileVerificationInput = {
  token: string | null | undefined;
  secretKey: string | undefined;
  remoteIp?: string;
  idempotencyKey?: string;
  nodeEnv?: string;
  fetcher?: typeof fetch;
};

type TurnstileSiteverifyResponse = {
  success?: boolean;
  "error-codes"?: string[];
};

export type TurnstileVerificationResult = {
  success: boolean;
  skipped: boolean;
  errorCodes: string[];
};

export async function verifyTurnstileToken({
  token,
  secretKey,
  remoteIp,
  idempotencyKey,
  nodeEnv = process.env.NODE_ENV,
  fetcher = fetch,
}: TurnstileVerificationInput): Promise<TurnstileVerificationResult> {
  if (!secretKey) {
    if (nodeEnv !== "production") {
      return { success: true, skipped: true, errorCodes: [] };
    }

    return {
      success: false,
      skipped: false,
      errorCodes: ["turnstile-not-configured"],
    };
  }

  if (!token) {
    return {
      success: false,
      skipped: false,
      errorCodes: ["turnstile-token-missing"],
    };
  }

  try {
    const response = await fetcher(siteverifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
        ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
      }),
    });
    const result = (await response.json()) as TurnstileSiteverifyResponse;

    return {
      success: result.success === true,
      skipped: false,
      errorCodes: result["error-codes"] ?? [],
    };
  } catch {
    return {
      success: false,
      skipped: false,
      errorCodes: ["turnstile-validation-error"],
    };
  }
}
