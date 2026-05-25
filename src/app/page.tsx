import { LandingPage } from "@/components/landing-page";
import { localeFromSearchParams, type PageSearchParams } from "@/lib/routing";
import {
  emptyPublicStats,
  getPublicStats,
} from "@/server/repositories/public-stats";

export default async function Home({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const locale = await localeFromSearchParams(searchParams);
  const stats = await getPublicStats().catch(() => emptyPublicStats);

  return <LandingPage locale={locale} stats={stats} />;
}
