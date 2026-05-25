import type { Locale } from "./domain";

export type PageSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export async function localeFromSearchParams(
  searchParams?: PageSearchParams,
): Promise<Locale> {
  const params = searchParams ? await searchParams : {};
  return params.lang === "es" ? "es" : "en";
}
