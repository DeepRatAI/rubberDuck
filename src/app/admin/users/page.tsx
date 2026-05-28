import { AppShell } from "@/components/app-shell";
import { AdminAccounts } from "@/components/admin-accounts";
import { Panel, SectionHeader } from "@/components/ui/panel";
import type { Locale } from "@/lib/domain";
import { getDictionary } from "@/lib/i18n";
import type { PageSearchParams } from "@/lib/routing";
import { requireAdminUserId } from "@/server/current-user";
import { listModeratedAccounts } from "@/server/repositories/moderation";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const params = searchParams ? await searchParams : {};
  const locale: Locale = params.lang === "es" ? "es" : "en";
  const dictionary = getDictionary(locale);
  await requireAdminUserId({ locale });
  const accounts = await listModeratedAccounts();

  return (
    <AppShell active="Settings" locale={locale}>
      <div className="mx-auto max-w-5xl">
        <Panel>
          <SectionHeader
            title={dictionary.accountModeration}
            description={dictionary.adminUsersDescription}
          />
          <AdminAccounts accounts={accounts} locale={locale} />
        </Panel>
      </div>
    </AppShell>
  );
}
