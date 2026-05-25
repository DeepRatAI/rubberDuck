"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, RotateCcw, Square } from "lucide-react";

import { persistExerciseResult } from "@/app/actions";
import type { Locale } from "@/lib/domain";
import { getDictionary } from "@/lib/i18n";
import type { CourseExercise } from "@/lib/product-types";
import { Button } from "./ui/button";

type Result = {
  status: "idle" | "running" | "passed" | "failed";
  stdout: string;
  stderr: string;
  durationMs: number;
};

function formatFailure(stderr: string) {
  return stderr.startsWith("Python execution failed")
    ? stderr
    : `Python execution failed.\n${stderr || "Unknown Python error."}`;
}

export function CourseRunner({
  courseId,
  exercise,
  locale,
}: {
  courseId: string;
  exercise: CourseExercise;
  locale: Locale;
}) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [isPersisting, startTransition] = useTransition();
  const [code, setCode] = useState(exercise.starterCode);
  const [isHydrated, setIsHydrated] = useState(false);
  const [result, setResult] = useState<Result>({
    status: "idle",
    stdout: "",
    stderr: "",
    durationMs: 0,
  });
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker("/pyodide-worker.js");
    workerRef.current = worker;
    worker.postMessage({ id: "__preload__", preload: true });
    const hydrationTick = window.setTimeout(() => setIsHydrated(true), 0);

    return () => {
      window.clearTimeout(hydrationTick);
      worker.terminate();
      if (workerRef.current === worker) {
        workerRef.current = null;
      }
    };
  }, []);

  function stopWorker() {
    workerRef.current?.terminate();
    workerRef.current = null;
    setResult((current) =>
      current.status === "running" ? { ...current, status: "idle" } : current,
    );
  }

  function run() {
    if (result.status === "running") {
      stopWorker();
    }

    setResult({ status: "running", stdout: "", stderr: "", durationMs: 0 });

    const worker = workerRef.current ?? new Worker("/pyodide-worker.js");
    workerRef.current = worker;

    let timeout = 0;
    const cleanup = () => {
      window.clearTimeout(timeout);
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
    };

    const finishWorker = () => {
      cleanup();
      worker.terminate();
      if (workerRef.current === worker) {
        workerRef.current = null;
      }
    };

    function handleMessage(event: MessageEvent<Result & { id: string }>) {
      if (event.data.id === "__preload__") {
        return;
      }

      finishWorker();
      setResult(event.data);

      if (event.data.status === "passed" || event.data.status === "failed") {
        startTransition(() => {
          void persistExerciseResult({
            courseId,
            exerciseId: exercise.id,
            status: event.data.status,
            stdout: event.data.stdout,
            stderr: event.data.stderr,
            durationMs: event.data.durationMs,
          }).then(() => {
            if (event.data.status === "passed") {
              router.refresh();
            }
          });
        });
      }
    }

    function handleError(event: ErrorEvent) {
      finishWorker();
      setResult({
        status: "failed",
        stdout: "",
        stderr:
          event.message ||
          "Python execution failed before the worker could start.",
        durationMs: 0,
      });
    }

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);

    timeout = window.setTimeout(() => {
      finishWorker();
      setResult({
        status: "failed",
        stdout: "",
        stderr: "Execution timed out after 60 seconds.",
        durationMs: 60000,
      });
    }, 60000);

    worker.postMessage({
      id: exercise.id,
      code,
      assertionCode: exercise.assertionCode,
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-sm font-medium text-slate-950">{exercise.prompt}</p>
      </div>
      <textarea
        aria-label={`Python code for ${exercise.prompt}`}
        className="min-h-52 w-full resize-y border-0 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 outline-none"
        spellCheck={false}
        value={code}
        disabled={!isHydrated}
        onChange={(event) => setCode(event.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
        <Button
          type="button"
          variant="primary"
          onClick={run}
          disabled={!isHydrated || result.status === "running"}
        >
          <Play className="size-4" aria-hidden />
          {dictionary.run}
        </Button>
        <Button
          type="button"
          onClick={stopWorker}
          disabled={!isHydrated || result.status !== "running"}
        >
          <Square className="size-4" aria-hidden />
          {dictionary.stop}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="text-slate-700 hover:bg-white hover:text-slate-950"
          onClick={() => setCode(exercise.starterCode)}
          disabled={!isHydrated}
        >
          <RotateCcw className="size-4" aria-hidden />
          {dictionary.reset}
        </Button>
        <span className="ml-auto text-xs text-slate-500">
          {isPersisting
            ? dictionary.persistingTelemetry
            : dictionary.pythonKernel}
        </span>
      </div>
      {result.status !== "idle" ? (
        <div className="border-t border-slate-200 p-4">
          <div
            className={
              result.status === "passed"
                ? "rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
                : result.status === "failed"
                  ? "rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                  : "rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800"
            }
          >
            {result.status === "running"
              ? dictionary.runningExercise
              : result.status === "passed"
                ? exercise.successMessage
                : formatFailure(result.stderr)}
            {result.stdout ? (
              <pre className="mt-2 whitespace-pre-wrap font-mono text-xs">
                {result.stdout}
              </pre>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
