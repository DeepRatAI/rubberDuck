import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import type { Locale } from "@/lib/domain";
import { getDictionary } from "@/lib/i18n";
import { getLegalPage, legalNav, type LegalPageKey } from "@/lib/legal-content";
import { BrandMark } from "./brand";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";

export function LegalPage({
  locale,
  pageKey,
}: {
  locale: Locale;
  pageKey: LegalPageKey;
}) {
  const dictionary = getDictionary(locale);
  const page = getLegalPage(locale, pageKey);

  return (
    <main className="min-h-dvh text-[color:var(--foreground)]">
      <header className="theme-header border-b border-[color:var(--line)] px-5 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link href={`/?lang=${locale}`} aria-label={dictionary.home}>
            <BrandMark />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle locale={locale} />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-5xl gap-8 px-5 py-10 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <nav className="grid gap-2">
            {legalNav.map((item) => {
              const target = getLegalPage(locale, item.key);
              const active = item.key === pageKey;
              return (
                <Link
                  key={item.key}
                  href={`${item.href}?lang=${locale}`}
                  className={`rounded-md border px-3 py-2 text-sm transition ${
                    active
                      ? "border-[color:var(--accent)] bg-[color:var(--badge-cyan-bg)] text-[color:var(--foreground)]"
                      : "border-[color:var(--line)] text-[color:var(--muted)] hover:border-[color:var(--accent-2)] hover:text-[color:var(--foreground)]"
                  }`}
                >
                  {target.title}
                </Link>
              );
            })}
          </nav>
        </aside>
        <article className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.18)]">
          <div className="mb-8 flex items-start gap-3">
            <span className="mt-1 rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)] p-2 text-[color:var(--accent)]">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--accent)]">
                {dictionary.legal}
              </p>
              <h1 className="mt-2 text-3xl font-semibold">{page.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
                {page.description}
              </p>
              <p className="mt-2 text-xs text-[color:var(--muted)]">
                {dictionary.lastUpdated}: {page.updated}
              </p>
            </div>
          </div>
          <div className="grid gap-6">
            {page.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-semibold">{section.title}</h2>
                <div className="mt-3 grid gap-3 text-sm leading-7 text-[color:var(--muted)]">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}
