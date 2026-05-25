import { redirect } from "next/navigation";

import { OnboardingSurface } from "@/components/onboarding";
import { localeFromSearchParams, type PageSearchParams } from "@/lib/routing";
import { isUserOnboarded, requireCurrentUserId } from "@/server/current-user";

function safeNextPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return "/app";
  }

  if (value.startsWith("//") || value.startsWith("/api/auth")) {
    return "/app";
  }

  return value;
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const params = searchParams ? await searchParams : {};
  const locale = await localeFromSearchParams(searchParams);
  const next = safeNextPath(params.next);
  const viewerId = await requireCurrentUserId({ locale, next: "/onboarding" });
  const onboarded = await isUserOnboarded(viewerId);

  if (onboarded) {
    redirect(`${next}?lang=${locale}`);
  }

  return <OnboardingSurface locale={locale} nextPath={next} />;
}
