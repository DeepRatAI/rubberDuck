import { AppShell } from "@/components/app-shell";
import { SettingsProfile } from "@/components/settings-profile";
import { localeFromSearchParams, type PageSearchParams } from "@/lib/routing";
import { requireOnboardedUserId } from "@/server/current-user";
import { getProfileByUserId } from "@/server/repositories/profiles";

export default async function SettingsProfilePage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const locale = await localeFromSearchParams(searchParams);
  const viewerId = await requireOnboardedUserId({
    locale,
    next: "/settings/profile",
  });
  const profile = await getProfileByUserId(viewerId);

  return (
    <AppShell active="Settings" locale={locale}>
      <SettingsProfile locale={locale} profile={profile} />
    </AppShell>
  );
}
