"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, RotateCcw } from "lucide-react";

import { moderateEntity, resolveReport } from "@/app/actions";
import type { ModerationReport } from "@/server/repositories/moderation";
import { formatDateTime } from "@/lib/format";
import type { Locale } from "@/lib/domain";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Panel, SectionHeader } from "./ui/panel";

export function ModerationQueue({
  reports,
  locale,
}: {
  reports: ModerationReport[];
  locale: Locale;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setResolved(reportId: string, resolved: boolean) {
    setStatus(null);
    setError(null);
    startTransition(() => {
      void resolveReport({ reportId, resolved })
        .then(() => {
          setStatus(resolved ? "Report resolved." : "Report reopened.");
          router.refresh();
        })
        .catch((caught: unknown) => {
          setError(
            caught instanceof Error
              ? caught.message
              : "Moderation action failed.",
          );
        });
    });
  }

  function setEntityStatus(
    report: ModerationReport,
    action: "hide" | "restore",
  ) {
    setStatus(null);
    setError(null);
    startTransition(() => {
      void moderateEntity({
        entityType: report.entityType,
        entityId: report.entityId,
        action,
        reason:
          action === "hide"
            ? `moderation_${report.reason}`
            : "moderation_restored",
      })
        .then(() => {
          setStatus(action === "hide" ? "Entity hidden." : "Entity restored.");
          router.refresh();
        })
        .catch((caught: unknown) => {
          setError(
            caught instanceof Error
              ? caught.message
              : "Moderation action failed.",
          );
        });
    });
  }

  return (
    <Panel>
      <SectionHeader
        title="Moderation queue"
        description="Private reports for spam, malicious code, copyright, harassment, and other safety issues."
        action={<Badge tone="amber">{reports.length} reports</Badge>}
      />
      <div className="border-b border-[color:var(--line)] px-4 py-3">
        {status ? (
          <span className="text-sm text-emerald-100">{status}</span>
        ) : null}
        {error ? <span className="text-sm text-amber-100">{error}</span> : null}
      </div>
      <div className="divide-y divide-[color:var(--line)]">
        {reports.map((report) => (
          <article key={report.id} className="grid gap-3 p-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={report.resolved ? "green" : "amber"}>
                  {report.resolved ? "resolved" : "open"}
                </Badge>
                <Badge tone="slate">{report.entityType}</Badge>
                <Badge
                  tone={report.entityStatus === "hidden" ? "amber" : "slate"}
                >
                  {report.entityStatus}
                </Badge>
                <span className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
                  {report.reason.replaceAll("_", " ")}
                </span>
              </div>
              <h2 className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">
                {report.entityLabel}
              </h2>
              {report.details ? (
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  {report.details}
                </p>
              ) : null}
              <p className="mt-3 text-xs text-[color:var(--muted)]">
                Reported by {report.reporterName} ({report.reporterEmail}) ·{" "}
                {formatDateTime(report.createdAt, locale)}
              </p>
            </div>
            <div className="flex items-start gap-2 lg:col-span-4 lg:justify-end">
              {report.entityType === "post" ||
              report.entityType === "comment" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="subtle"
                  disabled={isPending || report.entityStatus === "missing"}
                  onClick={() =>
                    setEntityStatus(
                      report,
                      report.entityStatus === "hidden" ? "restore" : "hide",
                    )
                  }
                >
                  {report.entityStatus === "hidden" ? "Restore" : "Hide"}
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant={report.resolved ? "subtle" : "primary"}
                disabled={isPending}
                onClick={() => setResolved(report.id, !report.resolved)}
              >
                {report.resolved ? (
                  <RotateCcw className="size-3.5" aria-hidden />
                ) : (
                  <CheckCheck className="size-3.5" aria-hidden />
                )}
                {report.resolved ? "Reopen" : "Resolve"}
              </Button>
            </div>
          </article>
        ))}
        {reports.length === 0 ? (
          <p className="p-4 text-sm text-[color:var(--muted)]">
            No private reports have been submitted.
          </p>
        ) : null}
      </div>
    </Panel>
  );
}
