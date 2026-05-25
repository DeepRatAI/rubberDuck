import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  Code2,
  GitBranch,
  GraduationCap,
  LockKeyhole,
  Rss,
  TerminalSquare,
  UsersRound,
} from "lucide-react";

import type { Locale } from "@/lib/domain";
import { getDictionary } from "@/lib/i18n";
import { getLegalPage, legalNav } from "@/lib/legal-content";
import { formatCompact } from "@/lib/utils";
import type { PublicStats } from "@/server/repositories/public-stats";
import { BrandMark } from "./brand";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

export function LandingPage({
  locale,
  stats,
}: {
  locale: Locale;
  stats: PublicStats;
}) {
  const dictionary = getDictionary(locale);
  const metrics = [
    { label: dictionary.members, value: stats.members, icon: UsersRound },
    { label: dictionary.projects, value: stats.projects, icon: GitBranch },
    { label: dictionary.courses, value: stats.courses, icon: Code2 },
    { label: dictionary.rssSources, value: stats.rssSources, icon: Rss },
  ];

  return (
    <main className="min-h-dvh text-[color:var(--foreground)]">
      <header className="relative z-[250] mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-4">
        <nav className="hidden items-center gap-8 text-sm font-medium text-[color:var(--muted)] md:flex">
          <Link
            className="hover:text-[color:var(--accent)]"
            href={`/binnacle?lang=${locale}`}
          >
            {dictionary.binnacle}
          </Link>
          <Link
            className="hover:text-[color:var(--accent)]"
            href={`/courses?lang=${locale}`}
          >
            {dictionary.courses}
          </Link>
          <Link
            className="hover:text-[color:var(--accent)]"
            href={`/u/alexchen?lang=${locale}`}
          >
            {dictionary.identityHub}
          </Link>
          <Link
            className="hover:text-[color:var(--accent)]"
            href="https://github.com"
            target="_blank"
          >
            {dictionary.github}
          </Link>
        </nav>
        <div className="justify-self-center">
          <BrandMark />
        </div>
        <div className="flex items-center justify-end gap-2">
          <ThemeToggle />
          <LanguageToggle locale={locale} />
          <Button asChild variant="primary">
            <Link href={`/login?lang=${locale}&next=/app`}>
              {dictionary.join}
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl min-w-0 items-center gap-10 px-5 pb-8 pt-12 lg:grid-cols-[0.9fr_1.1fr] lg:pt-20">
        <div className="min-w-0">
          <p className="max-w-full break-words font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--accent)] sm:tracking-[0.24em]">
            {dictionary.landingKicker}
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-[color:var(--foreground)] sm:text-6xl">
            {dictionary.landingTitle}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[color:var(--muted)]">
            {dictionary.landingSubtitle}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="primary" size="lg">
              <Link href={`/login?lang=${locale}&next=/app`}>
                {dictionary.join}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg">
              <Link href={`/binnacle?lang=${locale}`}>
                {dictionary.explore}
              </Link>
            </Button>
          </div>
          <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className="border-l border-[color:var(--line)] pl-3"
                >
                  <dt className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
                    <Icon className="size-3.5" aria-hidden />
                    {metric.label}
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-[color:var(--foreground)]">
                    {formatCompact(metric.value)}+
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>

        <div className="min-w-0 rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-3 shadow-[0_24px_90px_rgba(0,0,0,0.3)]">
          <div className="cyber-only-panel grid overflow-hidden rounded-md border border-[color:var(--line)] lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative min-h-72 border-b border-[color:var(--line)] lg:border-b-0 lg:border-r">
              <Image
                src="/rubberduck-circuit-board.svg"
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 45vw"
                priority
                loading="eager"
                className="object-cover opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#15130f] via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="flex items-center gap-2 text-xs text-[color:var(--accent)]">
                  <TerminalSquare className="size-4" aria-hidden />
                  {dictionary.landingRuntime}
                </div>
                <p className="mt-3 max-w-sm break-words text-sm leading-6 text-[#f6f0df]">
                  {dictionary.landingSurface}
                </p>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 border-b border-[color:var(--line)] px-3 py-2">
                <span className="size-2 rounded-full bg-[color:var(--danger)]" />
                <span className="size-2 rounded-full bg-[color:var(--accent-2)]" />
                <span className="size-2 rounded-full bg-[color:var(--success)]" />
                <span className="ml-3 min-w-0 truncate text-xs font-medium text-[#dbe7f3]">
                  rubberduck-course / generate_answer.py
                </span>
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words p-5 text-sm leading-7 text-stone-100 sm:whitespace-pre">
                <code>{`from rubberduck.runtime import notebook_cell
from rag.pipeline import retrieve, answer

@notebook_cell(gpu="colab-ready")
def generate(question):
    docs = retrieve(question, k=4)
    result = answer(question, docs)
    assert result.citations
    return result

print(generate("What changed in WebGPU?"))`}</code>
              </pre>
              <div className="grid border-t border-[color:var(--line)] sm:grid-cols-3">
                {[
                  [dictionary.binnacle, BookOpen],
                  [dictionary.courses, GraduationCap],
                  [dictionary.rss, Rss],
                ].map(([label, Icon]) => {
                  const TypedIcon = Icon as typeof Rss;
                  return (
                    <div
                      key={String(label)}
                      className="flex items-center gap-2 border-b border-[color:var(--line)] px-4 py-3 text-xs text-[#dbe7f3] last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
                    >
                      <TypedIcon
                        className="size-4 text-[color:var(--accent)]"
                        aria-hidden
                      />
                      {String(label)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)] px-3 py-2">
            <div className="flex -space-x-2">
              {["R", "D", "U", "C", "K"].map((letter) => (
                <span
                  key={letter}
                  className="flex size-7 items-center justify-center rounded-full border border-[color:var(--line)] bg-[color:var(--badge-cyan-bg)] text-xs font-semibold text-[color:var(--badge-cyan-text)]"
                >
                  {letter}
                </span>
              ))}
            </div>
            <p className="text-xs text-[color:var(--muted)]">
              {dictionary.landingActivity(formatCompact(stats.todayPosts))}
            </p>
            <span className="size-2 rounded-full bg-[color:var(--success)]" />
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--line)] bg-black/10">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-6 sm:grid-cols-4">
          {[
            [dictionary.openSourceFirst, GitBranch],
            [dictionary.developerNative, Code2],
            [dictionary.privacyRespecting, LockKeyhole],
            [dictionary.interoperableRss, Rss],
          ].map(([label, Icon]) => {
            const TypedIcon = Icon as typeof GitBranch;
            return (
              <div
                key={String(label)}
                className="flex items-center gap-3 text-sm text-[color:var(--muted)]"
              >
                <TypedIcon
                  className="size-4 text-[color:var(--accent)]"
                  aria-hidden
                />
                {String(label)}
              </div>
            );
          })}
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 border-t border-[color:var(--line)] px-5 py-4 text-xs text-[color:var(--muted)]">
          {legalNav.map((item) => (
            <Link
              key={item.key}
              href={`${item.href}?lang=${locale}`}
              className="hover:text-[color:var(--accent)]"
            >
              {getLegalPage(locale, item.key).title}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
