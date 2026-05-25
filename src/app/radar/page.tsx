import { AppShell } from "@/components/app-shell";
import { RadarSurface } from "@/components/radar";
import { localeFromSearchParams, type PageSearchParams } from "@/lib/routing";
import { requireOnboardedUserId } from "@/server/current-user";
import {
  listRadarProjects,
  type RadarBucket,
} from "@/server/repositories/radar";

const radarBuckets: RadarBucket[] = [
  "under_discovered",
  "needs_feedback",
  "needs_contributors",
  "active_interest",
];

function parseBucket(value: string | string[] | undefined) {
  return typeof value === "string" &&
    radarBuckets.includes(value as RadarBucket)
    ? (value as RadarBucket)
    : undefined;
}

function parseQuery(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim().slice(0, 100) : undefined;
}

export default async function RadarPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const params = searchParams ? await searchParams : {};
  const locale = await localeFromSearchParams(Promise.resolve(params));
  await requireOnboardedUserId({ locale, next: "/radar" });
  const bucket = parseBucket(params.bucket);
  const query = parseQuery(params.q);
  const projects = await listRadarProjects({ bucket, query });

  return (
    <AppShell active="Radar" locale={locale}>
      <RadarSurface
        locale={locale}
        projects={projects}
        activeBucket={bucket}
        query={query}
      />
    </AppShell>
  );
}
