"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import type { Locale } from "@/lib/domain";
import { getDictionary } from "@/lib/i18n";
import { submitOnboarding } from "@/app/actions";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Panel, SectionHeader } from "./ui/panel";

const stacks = [
  "TypeScript",
  "Python",
  "Rust",
  "Postgres",
  "React",
  "PyTorch",
  "Kubernetes",
  "WebGPU",
];
const interests = [
  "AI Engineering",
  "Developer Tools",
  "Web Development",
  "Data",
  "Education",
  "Open Source",
  "Security",
  "Infrastructure",
  "Systems",
  "Research",
];
const contentPreferences = [
  "Project Signals",
  "Open-source projects",
  "Technical build logs",
  "Courses",
  "Runnable exercises",
  "Architecture notes",
  "Research notes",
  "RSS engineering reads",
];
const participationIntents = [
  "I build projects",
  "I review projects",
  "I want to learn",
  "I can contribute",
  "I scout interesting work",
  "I mentor others",
];

export function OnboardingSurface({
  locale,
  nextPath = "/app",
}: {
  locale: Locale;
  nextPath?: string;
}) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [isPending, startTransition] = useTransition();
  const [selectedStack, setSelectedStack] = useState([
    "TypeScript",
    "Python",
    "Postgres",
  ]);
  const [selectedInterests, setSelectedInterests] = useState([
    "AI Engineering",
    "Open Source",
    "Developer Tools",
  ]);
  const [selectedContentPreferences, setSelectedContentPreferences] = useState([
    "Project Signals",
    "Runnable exercises",
    "Technical build logs",
  ]);
  const [selectedParticipationIntents, setSelectedParticipationIntents] =
    useState(["I build projects", "I review projects", "I can contribute"]);
  const [seniority, setSeniority] = useState("senior");
  const [workStatus, setWorkStatus] = useState("open_to_collaborate");
  const [availability, setAvailability] = useState("part_time");
  const [location, setLocation] = useState("Seattle, WA");
  const [error, setError] = useState<string | null>(null);

  function completeOnboarding() {
    setError(null);
    startTransition(() => {
      void submitOnboarding({
        stack: selectedStack,
        interests: selectedInterests,
        contentPreferences: selectedContentPreferences,
        participationIntents: selectedParticipationIntents,
        seniority,
        location,
        workStatus,
        availability,
        locale,
      })
        .then(() => {
          const separator = nextPath.includes("?") ? "&" : "?";
          router.push(`${nextPath}${separator}lang=${locale}`);
          router.refresh();
        })
        .catch((reason: unknown) => {
          setError(
            reason instanceof Error
              ? reason.message
              : dictionary.unableOnboarding,
          );
        });
    });
  }

  function toggle(
    value: string,
    current: string[],
    setter: (value: string[]) => void,
  ) {
    setter(
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  return (
    <main className="min-h-dvh px-4 py-8 text-[color:var(--foreground)]">
      <div className="mx-auto max-w-4xl">
        <Panel>
          <SectionHeader
            title={dictionary.onboarding}
            description={dictionary.onboardingDescription}
          />
          <div className="space-y-8 p-5">
            <section>
              <h2 className="text-sm font-semibold">{dictionary.stack}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {stacks.map((stack) => (
                  <button
                    key={stack}
                    type="button"
                    onClick={() =>
                      toggle(stack, selectedStack, setSelectedStack)
                    }
                  >
                    <Badge
                      tone={selectedStack.includes(stack) ? "blue" : "slate"}
                    >
                      {stack}
                    </Badge>
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-sm font-semibold">{dictionary.interests}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() =>
                      toggle(interest, selectedInterests, setSelectedInterests)
                    }
                  >
                    <Badge
                      tone={
                        selectedInterests.includes(interest) ? "green" : "slate"
                      }
                    >
                      {interest}
                    </Badge>
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-sm font-semibold">
                {dictionary.contentPreferences}
              </h2>
              <p className="mt-1 text-xs text-[color:var(--muted)]">
                {dictionary.contentPreferencesDescription}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {contentPreferences.map((preference) => (
                  <button
                    key={preference}
                    type="button"
                    onClick={() =>
                      toggle(
                        preference,
                        selectedContentPreferences,
                        setSelectedContentPreferences,
                      )
                    }
                  >
                    <Badge
                      tone={
                        selectedContentPreferences.includes(preference)
                          ? "amber"
                          : "slate"
                      }
                    >
                      {preference}
                    </Badge>
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-sm font-semibold">
                {dictionary.participationIntents}
              </h2>
              <p className="mt-1 text-xs text-[color:var(--muted)]">
                {dictionary.participationIntentsDescription}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {participationIntents.map((intent) => (
                  <button
                    key={intent}
                    type="button"
                    onClick={() =>
                      toggle(
                        intent,
                        selectedParticipationIntents,
                        setSelectedParticipationIntents,
                      )
                    }
                  >
                    <Badge
                      tone={
                        selectedParticipationIntents.includes(intent)
                          ? "cyan"
                          : "slate"
                      }
                    >
                      {intent}
                    </Badge>
                  </button>
                ))}
              </div>
            </section>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium">
                {dictionary.seniority}
                <select
                  className="control-input h-10 rounded-md border px-3 font-normal"
                  value={seniority}
                  onChange={(event) => setSeniority(event.target.value)}
                >
                  <option value="senior">{dictionary.senior}</option>
                  <option value="mid">{dictionary.mid}</option>
                  <option value="researcher">{dictionary.researcher}</option>
                  <option value="student">{dictionary.student}</option>
                  <option value="junior">{dictionary.junior}</option>
                  <option value="staff">{dictionary.staff}</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                {dictionary.workStatus}
                <select
                  className="control-input h-10 rounded-md border px-3 font-normal"
                  value={workStatus}
                  onChange={(event) => setWorkStatus(event.target.value)}
                >
                  <option value="open_to_collaborate">
                    {dictionary.openToCollaborate}
                  </option>
                  <option value="focused">{dictionary.focused}</option>
                  <option value="open_to_work">{dictionary.openToWork}</option>
                  <option value="hiring">{dictionary.hiring}</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                {dictionary.location}
                <input
                  className="control-input h-10 rounded-md border px-3 font-normal"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium md:col-span-3">
                {dictionary.availability}
                <select
                  className="control-input h-10 rounded-md border px-3 font-normal"
                  value={availability}
                  onChange={(event) => setAvailability(event.target.value)}
                >
                  <option value="none">{dictionary.notAvailable}</option>
                  <option value="part_time">{dictionary.partTime}</option>
                  <option value="full_time">{dictionary.fullTime}</option>
                  <option value="advisory">{dictionary.advisory}</option>
                </select>
              </label>
            </div>
            {error ? (
              <p className="status-warning rounded-md p-3 text-sm">{error}</p>
            ) : null}
            <div className="status-success flex items-center justify-between rounded-lg p-4 text-sm">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4" aria-hidden />
                {dictionary.recommendationReady}
              </span>
              <Button
                variant="primary"
                disabled={
                  isPending ||
                  selectedStack.length === 0 ||
                  selectedInterests.length === 0 ||
                  selectedContentPreferences.length === 0 ||
                  selectedParticipationIntents.length === 0
                }
                onClick={completeOnboarding}
              >
                {dictionary.continue}
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        </Panel>
      </div>
    </main>
  );
}
