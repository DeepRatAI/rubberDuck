import type { Locale } from "./domain";

const localeTag: Record<Locale, string> = {
  en: "en-US",
  es: "es-ES",
};

const stableDateOptions = {
  timeZone: "UTC",
} satisfies Intl.DateTimeFormatOptions;

export function formatTime(value: string | Date, locale: Locale) {
  return new Intl.DateTimeFormat(localeTag[locale], {
    ...stableDateOptions,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDateTime(value: string | Date, locale: Locale) {
  return new Intl.DateTimeFormat(localeTag[locale], {
    ...stableDateOptions,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(localeTag[locale]).format(value);
}
