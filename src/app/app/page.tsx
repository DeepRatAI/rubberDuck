import { HomeDashboard } from "@/components/home-dashboard";
import { env } from "@/lib/env";
import { localeFromSearchParams, type PageSearchParams } from "@/lib/routing";
import { requireOnboardedUserId } from "@/server/current-user";
import { getViewer, listFeedPage } from "@/server/repositories/feed";
import { listSuggestedProfiles } from "@/server/repositories/profiles";
import { getActivationSnapshot } from "@/server/repositories/activation";
import { listExternalTrends } from "@/server/repositories/trends";

export default async function AppPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const locale = await localeFromSearchParams(searchParams);
  const viewerId = await requireOnboardedUserId({ locale, next: "/app" });

  const [feedPage, viewer, suggestedProfiles, activation, externalTrends] =
    await Promise.all([
      listFeedPage({ viewerId, pageSize: 12 }),
      getViewer(viewerId),
      listSuggestedProfiles(viewerId),
      getActivationSnapshot(viewerId),
      listExternalTrends(),
    ]);

  return (
    <HomeDashboard
      locale={locale}
      feed={feedPage.items}
      feedNextCursor={feedPage.nextCursor}
      feedTotal={feedPage.total}
      viewer={viewer}
      suggestedProfiles={suggestedProfiles}
      publicBaseUrl={env.APP_URL}
      activation={activation}
      externalTrends={externalTrends}
    />
  );
}
