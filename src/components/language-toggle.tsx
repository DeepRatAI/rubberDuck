"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { Locale } from "@/lib/domain";

export function LanguageToggle({ locale }: { locale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setLocale(nextLocale: Locale) {
    const next = new URLSearchParams(params.toString());
    next.set("lang", nextLocale);
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="control-shell flex rounded-md p-0.5">
      {(["en", "es"] as const).map((option) => (
        <button
          key={option}
          className={
            locale === option
              ? "language-toggle-button h-8 rounded-md bg-[color:var(--accent)] px-2.5 text-xs font-semibold text-[color:var(--accent-contrast)]"
              : "language-toggle-button h-8 rounded-md px-2.5 text-xs font-semibold text-[color:var(--input-fg)] transition hover:bg-[color:var(--control-hover)]"
          }
          onClick={() => setLocale(option)}
          type="button"
          aria-pressed={locale === option}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
