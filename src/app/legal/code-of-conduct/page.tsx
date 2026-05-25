import type { Metadata } from "next";

import { LegalPage } from "@/components/legal-page";
import { localeFromSearchParams, type PageSearchParams } from "@/lib/routing";

export const metadata: Metadata = {
  title: "Code of Conduct - RubberDuck",
};

export default async function CodeOfConductPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const locale = await localeFromSearchParams(searchParams);
  return <LegalPage locale={locale} pageKey="code-of-conduct" />;
}
