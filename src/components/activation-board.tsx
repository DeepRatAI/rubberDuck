import Link from "next/link";
import {
  BookOpenCheck,
  CheckCircle2,
  Circle,
  GitBranch,
  MessageSquareHeart,
  Radio,
  Star,
  UserRoundPlus,
} from "lucide-react";

import type { Locale } from "@/lib/domain";
import { getDictionary } from "@/lib/i18n";
import type {
  ActivationSnapshot,
  ActivationTaskId,
} from "@/server/repositories/activation";
import { Badge } from "./ui/badge";
import { Panel, SectionHeader } from "./ui/panel";

const taskIcons: Record<ActivationTaskId, typeof Star> = {
  profile: Star,
  project_signal: GitBranch,
  helpful_answer: MessageSquareHeart,
  course: BookOpenCheck,
  follow: UserRoundPlus,
  save: Radio,
};

const taskCopyKeys = {
  profile: {
    title: "activation_profile_title",
    description: "activation_profile_description",
  },
  project_signal: {
    title: "activation_project_signal_title",
    description: "activation_project_signal_description",
  },
  helpful_answer: {
    title: "activation_helpful_answer_title",
    description: "activation_helpful_answer_description",
  },
  course: {
    title: "activation_course_title",
    description: "activation_course_description",
  },
  follow: {
    title: "activation_follow_title",
    description: "activation_follow_description",
  },
  save: {
    title: "activation_save_title",
    description: "activation_save_description",
  },
} as const satisfies Record<
  ActivationTaskId,
  {
    title: keyof ReturnType<typeof getDictionary>;
    description: keyof ReturnType<typeof getDictionary>;
  }
>;

export function ActivationBoard({
  locale,
  snapshot,
}: {
  locale: Locale;
  snapshot: ActivationSnapshot;
}) {
  const dictionary = getDictionary(locale);
  const nextTask =
    snapshot.tasks.find((task) => !task.completed) ?? snapshot.tasks[0];
  const nextTaskCopy = nextTask ? taskCopyKeys[nextTask.id] : null;

  return (
    <Panel className="overflow-hidden">
      <SectionHeader
        title={dictionary.activationBoard}
        description={dictionary.activationBoardDescription}
        action={<Badge tone="amber">{snapshot.completionPercent}%</Badge>}
      />
      <div className="grid gap-4 border-t border-[color:var(--line)] p-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-2)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
            {dictionary.nextBestAction}
          </p>
          <h2 className="mt-3 text-lg font-semibold">
            {nextTask
              ? dictionary[nextTaskCopy?.title ?? "activationCompleteTitle"]
              : dictionary.activationCompleteTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            {nextTask
              ? dictionary[
                  nextTaskCopy?.description ?? "activationCompleteDescription"
                ]
              : dictionary.activationCompleteDescription}
          </p>
          {nextTask ? (
            <Link
              href={`${nextTask.href}?lang=${locale}`}
              className="mt-4 inline-flex h-9 items-center justify-center rounded-md border border-[color:var(--accent)] bg-[color:var(--accent)] px-3 text-sm font-medium text-[color:var(--accent-contrast)]"
            >
              {dictionary.open}
            </Link>
          ) : null}
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.tasks.map((task) => {
            const Icon = taskIcons[task.id];
            const StatusIcon = task.completed ? CheckCircle2 : Circle;
            const taskCopy = taskCopyKeys[task.id];

            return (
              <Link
                key={task.id}
                href={`${task.href}?lang=${locale}`}
                className="group rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] p-3 transition hover:border-[color:var(--accent)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-9 items-center justify-center rounded-md bg-[color:var(--badge-cyan-bg)] text-[color:var(--badge-cyan-text)]">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <StatusIcon
                    className={
                      task.completed
                        ? "size-4 text-emerald-400"
                        : "size-4 text-[color:var(--muted)]"
                    }
                    aria-hidden
                  />
                </div>
                <h3 className="mt-3 text-sm font-semibold">
                  {dictionary[taskCopy.title]}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[color:var(--muted)]">
                  {dictionary[taskCopy.description]}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
