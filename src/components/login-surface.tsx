"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Code2, GitBranch, Mail, ShieldCheck, Sparkles } from "lucide-react";

import { brand } from "@/lib/brand";
import type { Locale } from "@/lib/domain";
import { getDictionary } from "@/lib/i18n";
import { BrandMark } from "./brand";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";

export function LoginSurface({
  locale,
  nextPath,
  providers,
}: {
  locale: Locale;
  nextPath: string;
  providers: {
    github: boolean;
    google: boolean;
    dev: boolean;
  };
}) {
  const dictionary = getDictionary(locale);
  const [authError, setAuthError] = useState<string | null>(null);
  const callbackUrl = nextPath.includes("?")
    ? `${nextPath}&lang=${locale}`
    : `${nextPath}?lang=${locale}`;

  async function handleLocalDevSignIn() {
    setAuthError(null);
    const csrfResponse = await fetch("/api/auth/csrf");

    if (!csrfResponse.ok) {
      setAuthError(dictionary.authLoginFailed);
      return;
    }

    const { csrfToken } = (await csrfResponse.json()) as {
      csrfToken?: string;
    };
    const response = await fetch("/api/auth/callback/dev-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        callbackUrl,
        csrfToken: csrfToken ?? "",
        json: "true",
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      url?: string;
      error?: string;
    } | null;

    if (!response.ok || payload?.error) {
      setAuthError(dictionary.authLoginFailed);
      return;
    }

    window.location.assign(payload?.url ?? callbackUrl);
  }

  return (
    <main className="min-h-dvh overflow-hidden bg-[#FCFCFF] text-[#102A43]">
      <div className="grid min-h-dvh lg:grid-cols-[0.48fr_0.52fr]">
        <section className="relative flex min-h-dvh flex-col justify-between px-6 py-5 sm:px-10 lg:px-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(255,212,71,0.28),transparent_20rem),radial-gradient(circle_at_85%_90%,rgba(255,159,28,0.14),transparent_18rem)]" />
          <div className="relative z-10 flex items-center justify-between gap-3">
            <BrandMark compact />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageToggle locale={locale} />
            </div>
          </div>

          <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10 font-[var(--font-nunito-sans)]">
            <div className="mx-auto flex flex-col items-center text-center">
              <div className="mb-4 w-36 sm:w-44">
                <Image
                  src={brand.fullLogoPath}
                  alt=""
                  width={176}
                  height={176}
                  priority
                  unoptimized
                  className="brand-logo-glow h-auto w-full object-contain"
                />
              </div>
              <h1 className="text-4xl font-extrabold leading-tight tracking-normal sm:text-5xl">
                {dictionary.loginWelcome}
                <span className="mt-1 block">
                  <span className="text-[#102A43]">rubber</span>
                  <span className="text-[#FFB703]">Duck</span>
                </span>
              </h1>
              <p className="mt-5 text-xl font-semibold text-[#FF7A00]">
                {dictionary.loginRegisterSubtitle}
              </p>
            </div>

            <div className="mt-9 grid gap-4">
              {providers.google ? (
                <button
                  type="button"
                  onClick={() => void signIn("google", { callbackUrl })}
                  className="flex h-14 items-center justify-center gap-3 rounded-xl bg-[#4D83F7] px-5 text-base font-bold text-white shadow-[0_14px_30px_rgba(77,131,247,0.24)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4D83F7]/30"
                >
                  <Mail className="size-5" aria-hidden />
                  {dictionary.continueWithGoogle}
                </button>
              ) : null}
              {providers.github ? (
                <button
                  type="button"
                  onClick={() => void signIn("github", { callbackUrl })}
                  className="flex h-14 items-center justify-center gap-3 rounded-xl bg-[#20252D] px-5 text-base font-bold text-white shadow-[0_14px_30px_rgba(16,42,67,0.2)] transition hover:bg-[#102A43] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#102A43]/25"
                >
                  <GitBranch className="size-5" aria-hidden />
                  {dictionary.continueWithGithub}
                </button>
              ) : null}
	              {providers.dev ? (
	                <button
	                  type="button"
	                  onClick={() => void handleLocalDevSignIn()}
	                  className="flex h-14 items-center justify-center gap-3 rounded-xl border border-[#102A43]/20 bg-white/80 px-5 text-base font-bold text-[#102A43] shadow-[0_14px_30px_rgba(16,42,67,0.08)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD447]/55"
	                >
                  <ShieldCheck className="size-5 text-[#0F8F60]" aria-hidden />
                  {dictionary.useLocalDevIdentity}
                </button>
	              ) : null}
	            </div>

	            {authError ? (
	              <p className="mt-4 rounded-xl border border-red-500/30 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
	                {authError}
	              </p>
	            ) : null}

            {!providers.github && !providers.google && !providers.dev ? (
              <p className="status-warning mt-5 rounded-xl p-3 text-sm">
                {dictionary.noProvidersConfigured}
              </p>
            ) : null}

            <div className="mt-9 rounded-[1.35rem] border border-[#FF9F1C]/35 bg-[#FFDCA3] px-5 py-5 text-center shadow-[0_16px_40px_rgba(255,159,28,0.16)]">
              <p className="font-mono text-lg font-bold leading-tight tracking-normal text-[#102A43] sm:text-xl">
                {dictionary.loginPitch}
              </p>
            </div>

            <div className="mt-7 grid gap-3 text-sm font-semibold text-[#536A7F]">
              {[
                [dictionary.loginBenefitAuth, ShieldCheck],
                [dictionary.loginBenefitOnboarding, Sparkles],
                [dictionary.loginBenefitNoNegatives, Code2],
              ].map(([item, Icon]) => {
                const TypedIcon = Icon as typeof ShieldCheck;

                return (
                  <div key={String(item)} className="flex items-center gap-2">
                    <TypedIcon className="size-4 text-[#FF9F1C]" aria-hidden />
                    {String(item)}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative hidden min-h-dvh overflow-hidden bg-[#F6F6F2] lg:flex lg:flex-col lg:items-center lg:justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,212,71,0.24),transparent_24rem),linear-gradient(180deg,#f7f7f3_0%,#e6e6e1_100%)]" />
          <div className="relative z-10 flex w-full max-w-3xl flex-col items-center justify-center px-10">
            <Image
              src={brand.wordmarkPath}
              alt={brand.productName}
              width={619}
              height={111}
              priority
              unoptimized
              className="h-auto w-full max-w-[560px] object-contain"
            />
            <div className="relative mt-6 aspect-square w-full max-w-[min(58vw,760px)]">
              <Image
                src={brand.duckFallbackPath}
                alt=""
                fill
                priority
                unoptimized
                sizes="52vw"
                className="object-contain"
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
