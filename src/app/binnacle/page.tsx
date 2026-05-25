import { AppShell } from "@/components/app-shell";
import { FeedSurface } from "@/components/feed";
import { env } from "@/lib/env";
import { localeFromSearchParams, type PageSearchParams } from "@/lib/routing";
import { requireOnboardedUserId } from "@/server/current-user";
import { getViewer, listFeedPage } from "@/server/repositories/feed";
import { listSuggestedProfiles } from "@/server/repositories/profiles";
import { listExternalTrends } from "@/server/repositories/trends";

export default async function BinnaclePage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const locale = await localeFromSearchParams(searchParams);
  const viewerId = await requireOnboardedUserId({
    locale,
    next: "/binnacle",
  });
  const [feedPage, viewer, suggestedProfiles, externalTrends] =
    await Promise.all([
      listFeedPage({ viewerId, pageSize: 10 }),
      getViewer(viewerId),
      listSuggestedProfiles(viewerId),
      listExternalTrends(),
    ]);

  return (
    <AppShell active="Binnacle" locale={locale}>
      <FeedSurface
        locale={locale}
        initialFeed={feedPage.items}
        initialNextCursor={feedPage.nextCursor}
        totalFeedItems={feedPage.total}
        viewer={viewer}
        suggestedProfiles={suggestedProfiles}
        externalTrends={externalTrends}
        publicBaseUrl={env.APP_URL}
      />
    </AppShell>
  );
}
