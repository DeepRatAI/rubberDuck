import { AppShell } from "@/components/app-shell";
import { NotificationsSurface } from "@/components/notifications";
import { localeFromSearchParams, type PageSearchParams } from "@/lib/routing";
import { requireOnboardedUserId } from "@/server/current-user";
import { listNotifications } from "@/server/repositories/notifications";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const locale = await localeFromSearchParams(searchParams);
  const viewerId = await requireOnboardedUserId({
    locale,
    next: "/notifications",
  });
  const notifications = await listNotifications(viewerId);

  return (
    <AppShell active="Notifications" locale={locale}>
      <NotificationsSurface locale={locale} notifications={notifications} />
    </AppShell>
  );
}
