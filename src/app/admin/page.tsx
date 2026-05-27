import Link from "next/link";
import { Activity, FileWarning, Rss, Shield, Users } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Panel, SectionHeader } from "@/components/ui/panel";
import { getDictionary } from "@/lib/i18n";
import { localeFromSearchParams, type PageSearchParams } from "@/lib/routing";
import { requireAdminUserId } from "@/server/current-user";
import {
  listAuditEvents,
  listModerationReports,
  listModeratedAccounts,
} from "@/server/repositories/moderation";
import {
  listRssSourceHealth,
  summarizeRssHealth,
} from "@/server/repositories/rss";

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const locale = await localeFromSearchParams(searchParams);
  const dictionary = getDictionary(locale);
  await requireAdminUserId({ locale });
  const [reports, accounts, audit, rssSources] = await Promise.all([
    listModerationReports(),
    listModeratedAccounts(),
    listAuditEvents(8),
    listRssSourceHealth(),
  ]);
  const rssSummary = summarizeRssHealth(rssSources);
  const openReports = reports.filter((report) => !report.resolved).length;
  const restrictedAccounts = accounts.filter(
    (account) => account.banned,
  ).length;

  const destinations = [
    {
      href: `/admin/reports?lang=${locale}`,
      label: dictionary.adminReports,
      description: dictionary.adminReportsDescription,
      value: openReports,
      icon: FileWarning,
    },
    {
      href: `/admin/users?lang=${locale}`,
      label: dictionary.adminUsers,
      description: dictionary.adminUsersDescription,
      value: restrictedAccounts,
      icon: Users,
    },
    {
      href: `/admin/rss?lang=${locale}`,
      label: dictionary.adminRss,
      description: dictionary.adminRssDescription,
      value: rssSummary.staleSources,
      icon: Rss,
    },
    {
      href: `/admin/audit?lang=${locale}`,
      label: dictionary.adminAudit,
      description: dictionary.adminAuditDescription,
      value: audit.length,
      icon: Activity,
    },
  ];

  return (
    <AppShell active="Settings" locale={locale}>
      <div className="mx-auto grid max-w-6xl gap-5">
        <Panel>
          <SectionHeader
            title={dictionary.adminOperations}
            description={dictionary.adminOperationsDescription}
          />
        </Panel>
        <div className="grid gap-4 md:grid-cols-2">
          {destinations.map((destination) => {
            const Icon = destination.icon;

            return (
              <Link
                key={destination.href}
                href={destination.href}
                className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-4 transition hover:border-[color:var(--accent)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex size-10 items-center justify-center rounded-md bg-[color:var(--surface-2)] text-[color:var(--accent)]">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="rounded-md border border-[color:var(--line)] px-2.5 py-1 text-sm font-semibold">
                    {destination.value}
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-semibold">
                  {destination.label}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  {destination.description}
                </p>
              </Link>
            );
          })}
        </div>
        <Panel>
          <SectionHeader
            title={dictionary.adminLatestAudit}
            description={dictionary.adminLatestAuditDescription}
            action={
              <Link
                href={`/admin/audit?lang=${locale}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--accent)]"
              >
                <Shield className="size-4" aria-hidden />
                {dictionary.openAuditTrail}
              </Link>
            }
          />
          <div className="divide-y divide-[color:var(--line)]">
            {audit.slice(0, 6).map((event) => (
              <div
                key={event.id}
                className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_180px]"
              >
                <div>
                  <p className="font-medium">{event.action}</p>
                  <p className="text-[color:var(--muted)]">
                    {event.actorName} {"->"} {event.entityType} {event.entityId}
                  </p>
                </div>
                <time className="text-[color:var(--muted)]">
                  {new Date(event.createdAt).toLocaleString(locale)}
                </time>
              </div>
            ))}
            {audit.length === 0 ? (
              <p className="p-4 text-sm text-[color:var(--muted)]">
                {dictionary.adminNoAuditEvents}
              </p>
            ) : null}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
