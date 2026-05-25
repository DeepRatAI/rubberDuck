import { AppShell } from "@/components/app-shell";
import { PeopleDirectory } from "@/components/people-directory";
import { localeFromSearchParams, type PageSearchParams } from "@/lib/routing";
import { requireOnboardedUserId } from "@/server/current-user";
import { listPeopleDirectory } from "@/server/repositories/people";

function queryFromParams(
  params: Record<string, string | string[] | undefined>,
) {
  const raw = params.q;
  return typeof raw === "string" ? raw.trim().slice(0, 80) : undefined;
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const params = searchParams ? await searchParams : {};
  const locale = await localeFromSearchParams(Promise.resolve(params));
  const viewerId = await requireOnboardedUserId({ locale, next: "/people" });
  const query = queryFromParams(params);
  const people = await listPeopleDirectory({ viewerId, query });

  return (
    <AppShell active="People" locale={locale}>
      <PeopleDirectory locale={locale} people={people} query={query} />
    </AppShell>
  );
}
