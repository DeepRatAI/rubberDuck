import { AppShell } from "@/components/app-shell";
import { SavedSurface } from "@/components/saved-surface";
import { localeFromSearchParams, type PageSearchParams } from "@/lib/routing";
import { requireOnboardedUserId } from "@/server/current-user";
import { listSavedItems } from "@/server/repositories/saved";

export default async function SavedPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const locale = await localeFromSearchParams(searchParams);
  const viewerId = await requireOnboardedUserId({ locale, next: "/saved" });
  const items = await listSavedItems(viewerId);

  return (
    <AppShell active="Saved" locale={locale}>
      <div className="mx-auto max-w-4xl">
        <SavedSurface items={items} locale={locale} />
      </div>
    </AppShell>
  );
}
