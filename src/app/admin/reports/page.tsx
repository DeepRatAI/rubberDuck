import { AppShell } from "@/components/app-shell";
import { ModerationQueue } from "@/components/moderation-queue";
import { localeFromSearchParams, type PageSearchParams } from "@/lib/routing";
import { requireAdminUserId } from "@/server/current-user";
import { listModerationReports } from "@/server/repositories/moderation";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const locale = await localeFromSearchParams(searchParams);
  await requireAdminUserId({ locale });
  const reports = await listModerationReports();

  return (
    <AppShell active="Settings" locale={locale}>
      <div className="mx-auto max-w-5xl">
        <ModerationQueue reports={reports} locale={locale} />
      </div>
    </AppShell>
  );
}
