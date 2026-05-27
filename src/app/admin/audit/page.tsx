import { AppShell } from "@/components/app-shell";
import { Panel, SectionHeader } from "@/components/ui/panel";
import { getDictionary } from "@/lib/i18n";
import { localeFromSearchParams, type PageSearchParams } from "@/lib/routing";
import { requireAdminUserId } from "@/server/current-user";
import { listAuditEvents } from "@/server/repositories/moderation";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const locale = await localeFromSearchParams(searchParams);
  const dictionary = getDictionary(locale);
  await requireAdminUserId({ locale });
  const events = await listAuditEvents(120);

  return (
    <AppShell active="Settings" locale={locale}>
      <div className="mx-auto max-w-6xl">
        <Panel>
          <SectionHeader
            title={dictionary.adminAudit}
            description={dictionary.adminAuditDescription}
          />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[color:var(--line)] text-sm">
              <thead className="bg-[color:var(--surface-2)] text-left text-xs uppercase tracking-wide text-[color:var(--muted)]">
                <tr>
                  <th className="px-4 py-3">{dictionary.action}</th>
                  <th className="px-4 py-3">{dictionary.actor}</th>
                  <th className="px-4 py-3">{dictionary.entity}</th>
                  <th className="px-4 py-3">{dictionary.metadata}</th>
                  <th className="px-4 py-3">{dictionary.createdAt}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)]">
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="px-4 py-3 font-medium">{event.action}</td>
                    <td className="px-4 py-3 text-[color:var(--muted)]">
                      {event.actorName}
                      {event.actorEmail ? (
                        <span className="block text-xs">
                          {event.actorEmail}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block">{event.entityType}</span>
                      <span className="block max-w-[220px] truncate text-xs text-[color:var(--muted)]">
                        {event.entityId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <code className="block max-w-[360px] overflow-hidden text-ellipsis rounded bg-[color:var(--surface-2)] px-2 py-1 text-xs text-[color:var(--muted)]">
                        {JSON.stringify(event.metadata)}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--muted)]">
                      {new Date(event.createdAt).toLocaleString(locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {events.length === 0 ? (
            <p className="p-4 text-sm text-[color:var(--muted)]">
              {dictionary.adminNoAuditEvents}
            </p>
          ) : null}
        </Panel>
      </div>
    </AppShell>
  );
}
