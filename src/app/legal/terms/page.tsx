import type { Metadata } from "next";

import { LegalPage } from "@/components/legal-page";
import { localeFromSearchParams, type PageSearchParams } from "@/lib/routing";

export const metadata: Metadata = {
  title: "Terms of Service - RubberDuck",
};

export default async function TermsPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const locale = await localeFromSearchParams(searchParams);
  return <LegalPage locale={locale} pageKey="terms" />;
}
