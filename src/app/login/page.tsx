import { redirect } from "next/navigation";

import { LoginSurface } from "@/components/login-surface";
import { localAuthFallbackEnabled } from "@/lib/auth";
import { env } from "@/lib/env";
import { localeFromSearchParams, type PageSearchParams } from "@/lib/routing";
import {
  getOptionalCurrentUserId,
  isUserOnboarded,
} from "@/server/current-user";

function safeNextPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return "/app";
  }

  if (value.startsWith("//") || value.startsWith("/api/auth")) {
    return "/app";
  }

  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const params = searchParams ? await searchParams : {};
  const locale = await localeFromSearchParams(searchParams);
  const nextPath = safeNextPath(params.next);
  const viewerId = await getOptionalCurrentUserId();

  if (viewerId) {
    const onboarded = await isUserOnboarded(viewerId);
    redirect(
      onboarded ? nextPath : `/onboarding?lang=${locale}&next=${nextPath}`,
    );
  }

  return (
    <LoginSurface
      locale={locale}
      nextPath={nextPath}
      providers={{
        github: Boolean(env.GITHUB_ID && env.GITHUB_SECRET),
        google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
        dev: localAuthFallbackEnabled,
      }}
    />
  );
}
