"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Braces,
  Check,
  CircleHelp,
  ExternalLink,
  FileUp,
  GitCompare,
  Heading1,
  ImagePlus,
  Link as LinkIcon,
  LineChart,
  List,
  PenLine,
  Play,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Table2,
  Trash2,
  Video,
  X,
} from "lucide-react";

import {
  saveCourseDraft,
  updateCourseMediaMetadata,
  uploadCourseMedia,
} from "@/app/actions";
import {
  addStudioEmbed,
  buildCourseStudioPayload,
  importNotebookToStudio,
  moveStudioSection,
  removeStudioEmbed,
  restoreSnapshotToStudio,
  type NotebookStudioImport,
  type RestoredCourseStudioState,
  type StudioExercise,
  type StudioSection,
} from "@/lib/course-studio";
import { classifyCourseEmbed } from "@/lib/course-embeds";
import { formatDateTime, formatTime } from "@/lib/format";
import {
  filterCourseMediaAssets,
  normalizeCourseMediaLabels,
  type CourseMediaAsset,
  type CourseMediaKindFilter,
} from "@/lib/course-media";
import {
  parseVisualizationRows,
  type CourseVisualization,
} from "@/lib/course-visualizations";
import type { Locale } from "@/lib/domain";
import type {
  CourseRevisionSummary,
  NotebookMetadata,
} from "@/lib/product-types";
import type { CreatorCourseAnalytics } from "@/server/repositories/courses";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Panel, SectionHeader } from "./ui/panel";

const initialSections: StudioSection[] = [
  {
    clientId: "contract",
    title: "1. Contract first",
    body: "Every production tutorial should define what the learner will build, how success is measured, and which assumptions the runnable checks enforce.",
    code: "required = ['input schema', 'observable output', 'fallback path']\nprint(required)",
    embeds: [],
    visualizations: [],
  },
  {
    clientId: "checkpoint",
    title: "2. Runnable checkpoint",
    body: "A checkpoint should be small enough to run in the browser, strict enough to prove understanding, and explicit about the expected output.",
    code: "answer = 'Source: RubberDuck course studio'\nprint(answer)",
    embeds: [],
    visualizations: [],
  },
];

const initialExercises: StudioExercise[] = [
  {
    id: "exercise-source",
    sectionClientId: "checkpoint",
    prompt: "Create an answer variable that includes the word Source.",
    starterCode: "answer = ''\nprint(answer)",
    assertionCode: "assert 'source' in answer.lower()",
    successMessage: "Grounded answer detected with source attribution.",
  },
];

type RevisionEvent = {
  id: string;
  revisionNumber: number;
  createdAt: string;
  snapshot: CourseRevisionSummary["snapshot"];
};

type AuthorMode = "compose" | "notebook" | "media" | "review" | "publish";

const authorModes: Array<{
  id: AuthorMode;
  label: string;
  detail: string;
}> = [
  {
    id: "compose",
    label: "Compose",
    detail: "Structure lessons, references, charts, and runnable cells.",
  },
  {
    id: "notebook",
    label: "Notebook",
    detail: "Import .ipynb material and keep Colab handoff metadata visible.",
  },
  {
    id: "media",
    label: "Media",
    detail: "Upload, label, describe, and attach visual course assets.",
  },
  {
    id: "review",
    label: "Review",
    detail: "Compare restore points and inspect the learner-facing preview.",
  },
  {
    id: "publish",
    label: "Publish",
    detail: "Clear readiness checks before publishing the course.",
  },
];

const walkthroughSteps = [
  {
    title: "Start with the spine",
    body: "Build the course from ordered sections. Each section owns its text, reference code, embeds, charts, and checkpoints.",
  },
  {
    title: "Author like documentation",
    body: "Use the canvas for narrative hierarchy, then keep executable reference code separate so reader mode can render it cleanly.",
  },
  {
    title: "Bring notebooks in",
    body: "Upload a .ipynb file to create editable sections, preserve notebook metadata, and expose a Colab handoff target.",
  },
  {
    title: "Attach real media",
    body: "Use the media library for course-owned images and videos with alt text, captions, labels, and reusable attachments.",
  },
  {
    title: "Publish only when ready",
    body: "Review restore points, check publish readiness, and keep every save as an immutable revision before sending learners to the reader.",
  },
];

type CourseEditorProps = {
  locale: Locale;
  initialDraftId?: string | null;
  initialSnapshot?: CourseRevisionSummary["snapshot"] | null;
  initialRevisions?: CourseRevisionSummary[];
  initialMediaAssets?: CourseMediaAsset[];
  creatorAnalytics?: CreatorCourseAnalytics;
};

function createClientId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function toRevisionEvent(
  revision: Pick<
    CourseRevisionSummary,
    "id" | "revisionNumber" | "createdAt" | "snapshot"
  >,
): RevisionEvent {
  return {
    id: revision.id,
    revisionNumber: revision.revisionNumber,
    createdAt: revision.createdAt,
    snapshot: revision.snapshot,
  };
}

function HelpTip({ children }: { children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        className="inline-flex size-6 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-400/10 text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
        aria-label="Context tip"
      >
        <CircleHelp className="size-3.5" aria-hidden />
      </button>
      <span className="pointer-events-none absolute right-0 top-8 z-30 hidden w-64 rounded-md border border-cyan-300/25 bg-[#15130f] p-3 text-xs leading-5 text-[color:var(--foreground)] shadow-[0_18px_60px_rgba(0,0,0,0.45)] group-focus-within:block group-hover:block">
        {children}
      </span>
    </span>
  );
}

function revisionDiff(
  revision: RevisionEvent,
  current: {
    title: string;
    sections: StudioSection[];
    exercises: StudioExercise[];
    charts: number;
    embeds: number;
  },
) {
  const snapshotCharts = revision.snapshot.sections.flatMap(
    (section) => section.visualizations,
  ).length;
  const snapshotEmbeds = revision.snapshot.sections.flatMap(
    (section) => section.embeds,
  ).length;

  return [
    {
      label: "Title",
      value: revision.snapshot.title === current.title ? "unchanged" : "edited",
    },
    {
      label: "Sections",
      value: `${revision.snapshot.sections.length} -> ${current.sections.length}`,
    },
    {
      label: "Runnable checks",
      value: `${revision.snapshot.exercises.length} -> ${current.exercises.length}`,
    },
    {
      label: "Embeds",
      value: `${snapshotEmbeds} -> ${current.embeds}`,
    },
    {
      label: "Charts",
      value: `${snapshotCharts} -> ${current.charts}`,
    },
  ];
}

export function CourseEditor({
  locale,
  initialDraftId = null,
  initialSnapshot = null,
  initialRevisions = [],
  initialMediaAssets = [],
  creatorAnalytics,
}: CourseEditorProps) {
  const router = useRouter();
  const initialStudioState = useMemo<RestoredCourseStudioState | null>(
    () => (initialSnapshot ? restoreSnapshotToStudio(initialSnapshot) : null),
    [initialSnapshot],
  );
  const bootSections =
    initialStudioState && initialStudioState.sections.length > 0
      ? initialStudioState.sections
      : initialSections;
  const bootExercises = initialStudioState?.exercises ?? initialExercises;
  const selectedSectionRef = useRef(bootSections[0]?.clientId ?? "");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isMediaPending, startMediaTransition] = useTransition();
  const [draftId, setDraftId] = useState<string | null>(initialDraftId);
  const [title, setTitle] = useState(
    initialStudioState?.title ?? "Building Reliable Agent Tools",
  );
  const [description, setDescription] = useState(
    initialStudioState?.description ??
      "Design tool calls, validation, telemetry, and fallback behavior for production agents.",
  );
  const [difficulty, setDifficulty] = useState<
    "beginner" | "intermediate" | "advanced"
  >(initialStudioState?.difficulty ?? "intermediate");
  const [tags, setTags] = useState(
    initialStudioState?.tagsInput ?? "agents, observability, python",
  );
  const [sections, setSections] = useState<StudioSection[]>(() => bootSections);
  const [exercises, setExercises] = useState<StudioExercise[]>(
    () => bootExercises,
  );
  const [selectedSectionId, setSelectedSectionId] = useState(
    bootSections[0]?.clientId ?? "",
  );
  const [notebook, setNotebook] = useState<NotebookMetadata | null>(
    initialStudioState?.notebook ?? null,
  );
  const [pendingNotebookImport, setPendingNotebookImport] =
    useState<NotebookStudioImport | null>(null);
  const [notebookError, setNotebookError] = useState<string | null>(null);
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceError, setResourceError] = useState<string | null>(null);
  const [mediaAssets, setMediaAssets] =
    useState<CourseMediaAsset[]>(initialMediaAssets);
  const [mediaQuery, setMediaQuery] = useState("");
  const [mediaKindFilter, setMediaKindFilter] =
    useState<CourseMediaKindFilter>("all");
  const [mediaLabelFilter, setMediaLabelFilter] = useState("all");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaStatus, setMediaStatus] = useState<string | null>(null);
  const [revisionEvents, setRevisionEvents] = useState<RevisionEvent[]>(() =>
    initialRevisions.map(toRevisionEvent),
  );
  const [authorMode, setAuthorMode] = useState<AuthorMode>("compose");
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [compareRevisionId, setCompareRevisionId] = useState<string | null>(
    null,
  );
  const [visualizationType, setVisualizationType] =
    useState<CourseVisualization["type"]>("bar");
  const [visualizationTitle, setVisualizationTitle] = useState("Quality gates");
  const [visualizationRows, setVisualizationRows] = useState(
    "Retrieval recall, 86\nCitation accuracy, 94\nLatency score, 71",
  );
  const [visualizationError, setVisualizationError] = useState<string | null>(
    null,
  );
  const [status, setStatus] = useState<
    "idle" | "dirty" | "saving" | "saved" | "error"
  >("idle");
  const [autosavedAt, setAutosavedAt] = useState("not saved yet");

  const selectedSection = sections.find(
    (section) => section.clientId === selectedSectionId,
  );
  const selectedExercises = exercises.filter(
    (exercise) => exercise.sectionClientId === selectedSectionId,
  );
  const filteredMediaAssets = useMemo(
    () =>
      filterCourseMediaAssets(mediaAssets, {
        kind: mediaKindFilter,
        label: mediaLabelFilter,
        query: mediaQuery,
      }),
    [mediaAssets, mediaKindFilter, mediaLabelFilter, mediaQuery],
  );
  const mediaLabels = useMemo(
    () => [...new Set(mediaAssets.flatMap((asset) => asset.labels))].sort(),
    [mediaAssets],
  );
  const hasMediaFilters =
    mediaQuery.trim().length > 0 ||
    mediaKindFilter !== "all" ||
    mediaLabelFilter !== "all";
  const currentCharts = sections.flatMap(
    (section) => section.visualizations,
  ).length;
  const currentEmbeds = sections.flatMap((section) => section.embeds).length;
  const publishChecks = useMemo(
    () => [
      {
        label: "Title is specific",
        passed: title.trim().length >= 8,
      },
      {
        label: "Description sets learner expectations",
        passed: description.trim().length >= 24,
      },
      {
        label: "Every section has a title and body",
        passed:
          sections.length > 0 &&
          sections.every(
            (section) =>
              section.title.trim().length >= 3 &&
              section.body.trim().length >= 20,
          ),
      },
      {
        label: "Runnable checks have prompts and assertions",
        passed: exercises.every(
          (exercise) =>
            exercise.prompt.trim().length >= 8 &&
            exercise.starterCode.trim().length > 0 &&
            exercise.assertionCode.trim().length > 0,
        ),
      },
      {
        label: "Course is free of public negative engagement",
        passed: true,
      },
    ],
    [description, exercises, sections, title],
  );
  const publishBlocked = publishChecks.some((check) => !check.passed);
  const compareRevision =
    revisionEvents.find((revision) => revision.id === compareRevisionId) ??
    null;

  const extensions = useMemo(
    () => [
      StarterKit,
      Placeholder.configure({
        placeholder:
          "Write the lesson. Keep it precise, executable, and documentation-grade.",
      }),
    ],
    [],
  );

  const editor = useEditor({
    extensions,
    immediatelyRender: false,
    content: `<p>${escapeHtml(bootSections[0]?.body ?? "")}</p>`,
    onUpdate: ({ editor: activeEditor }) => {
      const body = activeEditor.getText().trim();
      const activeSectionId = selectedSectionRef.current;
      setSections((current) =>
        current.map((section) =>
          section.clientId === activeSectionId ? { ...section, body } : section,
        ),
      );
      setStatus("dirty");
    },
  });

  function switchAuthorMode(mode: AuthorMode) {
    setAuthorMode(mode);
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-studio-mode="${mode}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  useEffect(() => {
    selectedSectionRef.current = selectedSectionId;
    const body =
      sections.find((section) => section.clientId === selectedSectionId)
        ?.body ?? "";

    if (editor && editor.getText().trim() !== body.trim()) {
      editor.commands.setContent(`<p>${escapeHtml(body)}</p>`);
    }
  }, [editor, sections, selectedSectionId]);

  function updateSelectedSection(patch: Partial<StudioSection>) {
    setSections((current) =>
      current.map((section) =>
        section.clientId === selectedSectionId
          ? { ...section, ...patch }
          : section,
      ),
    );
    setStatus("dirty");
  }

  function addSection() {
    const next: StudioSection = {
      clientId: createClientId("section"),
      title: `Section ${sections.length + 1}`,
      body: "Describe the concept, show the implementation path, and define what the learner should verify before moving on.",
      code: "",
      embeds: [],
      visualizations: [],
    };
    setSections((current) => [...current, next]);
    setSelectedSectionId(next.clientId);
    setStatus("dirty");
  }

  function addExercise() {
    setExercises((current) => [
      ...current,
      {
        id: createClientId("exercise"),
        sectionClientId: selectedSectionId,
        prompt: "Write code that satisfies the assertion.",
        starterCode: "answer = ''\nprint(answer)",
        assertionCode: "assert answer",
        successMessage: "Checkpoint passed.",
      },
    ]);
    setStatus("dirty");
  }

  function updateExercise(id: string, patch: Partial<StudioExercise>) {
    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === id ? { ...exercise, ...patch } : exercise,
      ),
    );
    setStatus("dirty");
  }

  function moveSelectedSection(direction: "up" | "down") {
    setSections((current) =>
      moveStudioSection(current, selectedSectionId, direction),
    );
    setStatus("dirty");
  }

  function addResource() {
    const change = addStudioEmbed(selectedSection?.embeds ?? [], resourceUrl);

    if (change.error) {
      setResourceError(change.error);
      return;
    }

    updateSelectedSection({ embeds: change.embeds });
    setResourceUrl("");
    setResourceError(null);
  }

  function removeResource(url: string) {
    updateSelectedSection({
      embeds: removeStudioEmbed(selectedSection?.embeds ?? [], url),
    });
    setResourceError(null);
  }

  function attachMediaAsset(asset: CourseMediaAsset) {
    const change = addStudioEmbed(selectedSection?.embeds ?? [], asset.url);

    if (change.error) {
      setMediaError(change.error);
      return;
    }

    updateSelectedSection({ embeds: change.embeds });
    setMediaError(null);
  }

  function uploadMediaAsset(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    setMediaError(null);
    setMediaStatus(null);

    startMediaTransition(() => {
      void uploadCourseMedia(formData)
        .then((asset) => {
          setMediaAssets((current) => [
            asset,
            ...current.filter((item) => item.id !== asset.id),
          ]);
          setMediaStatus(`${asset.originalFileName} uploaded.`);
        })
        .catch((error: unknown) => {
          setMediaError(
            error instanceof Error ? error.message : "Media upload failed.",
          );
        });
    });
  }

  function updateMediaAssetDraft(
    assetId: string,
    patch: Partial<Pick<CourseMediaAsset, "altText" | "caption" | "labels">>,
  ) {
    setMediaAssets((current) =>
      current.map((asset) =>
        asset.id === assetId ? { ...asset, ...patch } : asset,
      ),
    );
    setMediaStatus(null);
  }

  function saveMediaAssetMetadata(asset: CourseMediaAsset) {
    setMediaError(null);
    setMediaStatus(null);

    startMediaTransition(() => {
      void updateCourseMediaMetadata({
        assetId: asset.id,
        altText: asset.altText,
        caption: asset.caption,
        labels: asset.labels,
      })
        .then((updatedAsset) => {
          setMediaAssets((current) =>
            current.map((item) =>
              item.id === updatedAsset.id ? updatedAsset : item,
            ),
          );
          setMediaStatus(`${updatedAsset.originalFileName} details saved.`);
        })
        .catch((error: unknown) => {
          setMediaError(
            error instanceof Error
              ? error.message
              : "Media details could not be saved.",
          );
        });
    });
  }

  function addVisualization() {
    const parsed = parseVisualizationRows(visualizationRows);
    const title = visualizationTitle.trim() || "Untitled visualization";

    if (title.length < 3) {
      setVisualizationError(
        "Visualization title must be at least 3 characters.",
      );
      return;
    }

    if (parsed.error) {
      setVisualizationError(parsed.error);
      return;
    }

    const visualization: CourseVisualization = {
      id: createClientId("visualization"),
      type: visualizationType,
      title,
      data: parsed.data,
    };

    updateSelectedSection({
      visualizations: [
        ...(selectedSection?.visualizations ?? []),
        visualization,
      ].slice(0, 6),
    });
    setVisualizationError(null);
  }

  function removeVisualization(id: string) {
    updateSelectedSection({
      visualizations: (selectedSection?.visualizations ?? []).filter(
        (visualization) => visualization.id !== id,
      ),
    });
    setVisualizationError(null);
  }

  function applyRestoredState(restored: RestoredCourseStudioState) {
    const restoredSections =
      restored.sections.length > 0 ? restored.sections : initialSections;
    const nextSelectedSectionId = restoredSections[0]?.clientId ?? "";

    selectedSectionRef.current = nextSelectedSectionId;
    setTitle(restored.title);
    setDescription(restored.description);
    setDifficulty(restored.difficulty);
    setTags(restored.tagsInput);
    setSections(restoredSections);
    setExercises(restored.exercises);
    setSelectedSectionId(nextSelectedSectionId);
    setNotebook(restored.notebook);
    setNotebookError(null);
    setResourceUrl("");
    setResourceError(null);
    setVisualizationError(null);
    editor?.commands.setContent(
      `<p>${escapeHtml(restoredSections[0]?.body ?? "")}</p>`,
    );
    setStatus("dirty");
  }

  function restoreRevision(revision: RevisionEvent) {
    applyRestoredState(restoreSnapshotToStudio(revision.snapshot));
    setAutosavedAt(`restored v${revision.revisionNumber}`);
  }

  async function importNotebook(file: File) {
    try {
      const raw = await file.text();
      const imported = importNotebookToStudio(file.name, raw);

      setPendingNotebookImport(imported);
      setNotebookError(null);
    } catch {
      setPendingNotebookImport(null);
      setNotebookError(
        "We could not read that notebook. Upload a valid .ipynb JSON export.",
      );
      setStatus("error");
    }
  }

  function applyPendingNotebookImport() {
    if (!pendingNotebookImport) {
      return;
    }

    setNotebook(pendingNotebookImport.metadata);

    if (pendingNotebookImport.sections.length > 0) {
      const sectionIdMap = new Map(
        pendingNotebookImport.sections.map((section) => [
          section.clientId,
          createClientId(section.clientId),
        ]),
      );
      const importedSections = pendingNotebookImport.sections.map(
        (section) => ({
          ...section,
          clientId: sectionIdMap.get(section.clientId) ?? section.clientId,
        }),
      );
      const importedExercises = pendingNotebookImport.exercises.map(
        (exercise) => ({
          ...exercise,
          id: createClientId("notebook-exercise"),
          sectionClientId:
            sectionIdMap.get(exercise.sectionClientId) ??
            exercise.sectionClientId,
        }),
      );

      setSections((current) => [...current, ...importedSections]);
      setExercises((current) => [...current, ...importedExercises]);
      setSelectedSectionId(importedSections[0]?.clientId ?? selectedSectionId);
    }

    setPendingNotebookImport(null);
    setNotebookError(null);
    setStatus("dirty");
  }

  const studioPayload = useCallback(
    (nextStatus: "draft" | "published") => {
      return buildCourseStudioPayload({
        draftId: draftId ?? undefined,
        title,
        description,
        difficulty,
        status: nextStatus,
        tagsInput: tags,
        content: editor?.getJSON() ?? {},
        sections,
        exercises,
        notebook,
      });
    },
    [
      description,
      difficulty,
      draftId,
      editor,
      exercises,
      notebook,
      sections,
      tags,
      title,
    ],
  );

  const persist = useCallback(
    (nextStatus: "draft" | "published", silent = false) => {
      const payload = studioPayload(nextStatus);
      setStatus("saving");
      startTransition(() => {
        void saveCourseDraft(payload)
          .then((result) => {
            setDraftId(result.draft.id);
            if (result.draft.revision) {
              const revisionEvent = toRevisionEvent(result.draft.revision);
              setRevisionEvents((current) => [
                revisionEvent,
                ...current.filter(
                  (revision) => revision.id !== revisionEvent.id,
                ),
              ]);
            }
            setAutosavedAt(formatTime(result.savedAt, locale));
            setStatus("saved");

            if (nextStatus === "published") {
              router.push(`/courses/${result.draft.slug}?lang=${locale}`);
            } else {
              router.refresh();
            }
          })
          .catch(() => {
            if (!silent) {
              setStatus("error");
            }
          });
      });
    },
    [locale, router, startTransition, studioPayload],
  );

  useEffect(() => {
    if (status !== "dirty" || !editor) {
      return;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      persist("draft", true);
    }, 1800);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [
    description,
    difficulty,
    editor,
    exercises,
    notebook,
    sections,
    status,
    tags,
    title,
    persist,
  ]);

  const activeWalkthrough =
    walkthroughSteps[walkthroughStep] ?? walkthroughSteps[0];

  return (
    <div
      className="grid min-h-[calc(100dvh-7rem)] grid-cols-1 gap-5 xl:grid-cols-[260px_minmax(0,1fr)_340px]"
      data-locale={locale}
    >
      {walkthroughOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-studio-walkthrough-title"
            className="w-full max-w-xl rounded-lg border border-cyan-300/25 bg-[#15130f] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.55)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)]">
                  Course Studio walkthrough
                </p>
                <h2
                  id="course-studio-walkthrough-title"
                  className="mt-2 text-xl font-semibold text-[color:var(--foreground)]"
                >
                  {activeWalkthrough.title}
                </h2>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Close walkthrough"
                onClick={() => setWalkthroughOpen(false)}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>
            <p className="mt-4 text-sm leading-6 text-[color:var(--muted)]">
              {activeWalkthrough.body}
            </p>
            <div className="mt-5 flex items-center gap-2">
              {walkthroughSteps.map((step, index) => (
                <button
                  key={step.title}
                  type="button"
                  aria-label={`Open walkthrough step ${index + 1}`}
                  className={`h-1.5 flex-1 rounded-full ${
                    index === walkthroughStep
                      ? "bg-[color:var(--accent)]"
                      : "bg-white/15"
                  }`}
                  onClick={() => setWalkthroughStep(index)}
                />
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setWalkthroughOpen(false)}
              >
                Skip
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="subtle"
                  disabled={walkthroughStep === 0}
                  onClick={() =>
                    setWalkthroughStep((step) => Math.max(0, step - 1))
                  }
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    if (walkthroughStep === walkthroughSteps.length - 1) {
                      setWalkthroughOpen(false);
                      setWalkthroughStep(0);
                      return;
                    }
                    setWalkthroughStep((step) =>
                      Math.min(walkthroughSteps.length - 1, step + 1),
                    );
                  }}
                >
                  {walkthroughStep === walkthroughSteps.length - 1
                    ? "Finish"
                    : "Next"}
                </Button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
      <section className="xl:col-span-3">
        <Panel className="overflow-hidden border-cyan-300/20 bg-[#18130f]/95">
          <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="cyan">Creator command deck</Badge>
                <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  {draftId ? "Draft linked" : "New draft"}
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                Course Studio
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
                Documentation-grade authoring with notebook import, executable
                checks, media, charts, revisions, and publish readiness in one
                dense surface.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="subtle"
                onClick={() => setWalkthroughOpen(true)}
              >
                <CircleHelp className="size-4" aria-hidden />
                Walkthrough
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => switchAuthorMode("publish")}
              >
                <ShieldCheck className="size-4" aria-hidden />
                Review launch
              </Button>
            </div>
          </div>
          <div
            className="grid gap-2 border-t border-[color:var(--line)] p-3 md:grid-cols-5"
            role="tablist"
            aria-label="Course Studio authoring modes"
          >
            {authorModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={authorMode === mode.id}
                className={`rounded-md border p-3 text-left transition ${
                  authorMode === mode.id
                    ? "border-cyan-300/35 bg-cyan-400/10 text-cyan-50"
                    : "border-white/10 bg-white/[0.03] text-[color:var(--muted)] hover:border-cyan-300/25 hover:text-[color:var(--foreground)]"
                }`}
                onClick={() => switchAuthorMode(mode.id)}
              >
                <span className="block text-sm font-semibold">
                  {mode.label}
                </span>
                <span className="mt-1 block text-xs leading-5">
                  {mode.detail}
                </span>
              </button>
            ))}
          </div>
        </Panel>
      </section>
      {editor ? (
        <span data-testid="studio-hydrated" className="sr-only">
          Course Studio hydrated
        </span>
      ) : null}
      <aside className="min-w-0 space-y-5">
        <Panel className="p-4" data-studio-mode="compose">
          <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Course spine</h2>
              <HelpTip>
                Sections are the learner-facing table of contents. Keep each one
                focused enough to pair with a runnable check or a clear
                reference implementation.
              </HelpTip>
            </div>
            <Button
              size="sm"
              aria-label="Add section"
              className="w-full scroll-mt-20 sm:w-auto"
              onClick={addSection}
            >
              <Plus className="size-4" aria-hidden />
              Section
            </Button>
          </div>
          <nav className="mt-4 space-y-1">
            {sections.map((section, index) => (
              <div
                key={section.clientId}
                className={
                  section.clientId === selectedSectionId
                    ? "flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5 text-blue-800"
                    : "flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-slate-600 hover:bg-slate-50"
                }
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-sm font-medium"
                  onClick={() => setSelectedSectionId(section.clientId)}
                >
                  {index + 1}. {section.title}
                </button>
                <button
                  type="button"
                  aria-label={`Move ${section.title} up`}
                  className="rounded p-1 text-slate-500 hover:bg-white hover:text-blue-700 disabled:opacity-30"
                  disabled={index === 0}
                  onClick={() => {
                    setSelectedSectionId(section.clientId);
                    setSections((current) =>
                      moveStudioSection(current, section.clientId, "up"),
                    );
                    setStatus("dirty");
                  }}
                >
                  <ArrowUp className="size-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${section.title} down`}
                  className="rounded p-1 text-slate-500 hover:bg-white hover:text-blue-700 disabled:opacity-30"
                  disabled={index === sections.length - 1}
                  onClick={() => {
                    setSelectedSectionId(section.clientId);
                    setSections((current) =>
                      moveStudioSection(current, section.clientId, "down"),
                    );
                    setStatus("dirty");
                  }}
                >
                  <ArrowDown className="size-3.5" aria-hidden />
                </button>
              </div>
            ))}
          </nav>
        </Panel>

        {creatorAnalytics ? (
          <Panel className="p-4" data-studio-mode="review">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Creator analytics</h2>
                <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">
                  Real course signals from saves, Thanks, completions, section
                  views, and runnable checkpoint passes.
                </p>
              </div>
              <Badge tone="green">
                {creatorAnalytics.publishedCourses}/
                {creatorAnalytics.totalCourses} live
              </Badge>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {[
                ["Learners", creatorAnalytics.activeLearners],
                ["Completions", creatorAnalytics.totalCompletions],
                ["Thanks", creatorAnalytics.totalThanks],
                ["Saves", creatorAnalytics.totalSaves],
                ["Section views", creatorAnalytics.sectionViews],
                ["Check passes", creatorAnalytics.exercisePasses],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)] p-2"
                >
                  <dt className="text-[color:var(--muted)]">{label}</dt>
                  <dd className="mt-1 text-lg font-semibold text-[color:var(--foreground)]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            {creatorAnalytics.courses.length > 0 ? (
              <div className="mt-4 space-y-2">
                {creatorAnalytics.courses.slice(0, 4).map((course) => (
                  <div
                    key={course.id}
                    className="rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] p-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-semibold text-[color:var(--foreground)]">
                        {course.title}
                      </span>
                      <Badge
                        tone={course.status === "published" ? "green" : "slate"}
                      >
                        {course.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[color:var(--muted)]">
                      {course.completions} completions / {course.thanks} Thanks
                      / {course.saves} saves
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </Panel>
        ) : null}

        <Panel className="p-4" data-studio-mode="notebook">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Notebook import</h2>
            <HelpTip>
              Markdown headings become editable sections. Code cells become
              reference code unless their metadata marks them as RubberDuck
              exercises.
            </HelpTip>
          </div>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            Import `.ipynb` lessons as editable sections, reference code,
            runnable checkpoints, and Colab-ready notebook metadata.
          </p>
          <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-600 hover:border-blue-300 hover:bg-blue-50">
            <FileUp className="size-4" aria-hidden />
            {notebook?.fileName ?? "Choose .ipynb"}
            <input
              type="file"
              accept=".ipynb,application/x-ipynb+json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void importNotebook(file);
                }
              }}
            />
          </label>
          {pendingNotebookImport ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    Import preview: {pendingNotebookImport.metadata.fileName}
                  </p>
                  <p className="mt-1">
                    {pendingNotebookImport.metadata.cellCount} cells /{" "}
                    {pendingNotebookImport.sections.length} sections /{" "}
                    {pendingNotebookImport.exercises.length} runnable checks
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={applyPendingNotebookImport}
                  >
                    Apply import
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setPendingNotebookImport(null)}
                  >
                    Discard
                  </Button>
                </div>
              </div>
              <div className="mt-3 max-h-52 overflow-auto rounded border border-amber-200 bg-white">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-amber-100 text-[11px] uppercase text-amber-900">
                    <tr>
                      <th className="px-2 py-1">Cell</th>
                      <th className="px-2 py-1">Mapping</th>
                      <th className="px-2 py-1">Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingNotebookImport.cellMap.map((mapping) => (
                      <tr
                        key={`${mapping.index}-${mapping.kind}`}
                        className="border-t border-amber-100"
                      >
                        <td className="px-2 py-1 font-mono">
                          In [{mapping.index + 1}]
                        </td>
                        <td className="px-2 py-1">
                          <span className="font-semibold">
                            {mapping.kind.replace("_", " ")}
                          </span>
                          <span className="block text-slate-600">
                            {mapping.title}
                          </span>
                        </td>
                        <td className="px-2 py-1 font-mono text-[11px] text-slate-500">
                          {mapping.targetSectionClientId ?? "none"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          {notebook ? (
            <div className="mt-4 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600">
              <p className="font-medium text-slate-900">{notebook.fileName}</p>
              <p className="mt-1">
                {notebook.cellCount} cells / {notebook.language}
              </p>
              <ul className="mt-2 space-y-1">
                {notebook.outline.slice(0, 5).map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {notebookError ? (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              {notebookError}
            </p>
          ) : null}
        </Panel>

        <Panel className="p-4" data-studio-mode="media">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Media library</h2>
              <HelpTip>
                Course media is owned by the authoring workspace first. Add alt
                text and captions before attaching assets to sections.
              </HelpTip>
            </div>
            <Badge tone="blue">{mediaAssets.length}</Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Upload course images or short videos, then attach them to the
            selected section as first-class resources.
          </p>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Search media
              <span className="flex h-9 min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-slate-500 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100">
                <Search className="size-3.5 shrink-0" aria-hidden />
                <input
                  aria-label="Search media library"
                  className="min-w-0 flex-1 bg-transparent text-sm font-normal text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Filename, alt text, caption"
                  value={mediaQuery}
                  onChange={(event) => setMediaQuery(event.target.value)}
                />
              </span>
            </label>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div
                aria-label="Media type filter"
                className="inline-grid grid-cols-3 rounded-md border border-slate-200 bg-slate-50 p-0.5"
                role="group"
              >
                {(
                  [
                    ["all", "All media"],
                    ["image", "Images"],
                    ["video", "Videos"],
                  ] satisfies Array<[CourseMediaKindFilter, string]>
                ).map(([kind, label]) => (
                  <button
                    key={kind}
                    type="button"
                    aria-pressed={mediaKindFilter === kind}
                    className={`h-8 rounded px-2 text-xs font-medium transition ${
                      mediaKindFilter === kind
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-slate-600 hover:bg-white"
                    }`}
                    onClick={() => setMediaKindFilter(kind)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                Label
                <select
                  aria-label="Media label filter"
                  className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-normal text-slate-700"
                  value={mediaLabelFilter}
                  onChange={(event) => setMediaLabelFilter(event.target.value)}
                >
                  <option value="all">All labels</option>
                  {mediaLabels.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <p
                className="text-xs text-slate-500"
                aria-live="polite"
                aria-atomic="true"
              >
                Showing {filteredMediaAssets.length} of {mediaAssets.length}
              </p>
            </div>
            {hasMediaFilters ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="justify-self-start"
                onClick={() => {
                  setMediaQuery("");
                  setMediaKindFilter("all");
                  setMediaLabelFilter("all");
                }}
              >
                <RotateCcw className="size-3.5" aria-hidden />
                Clear filters
              </Button>
            ) : null}
          </div>
          <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600 hover:border-cyan-300 hover:bg-cyan-50">
            <ImagePlus className="size-4" aria-hidden />
            {isMediaPending ? "Uploading..." : "Upload media"}
            <input
              type="file"
              accept="image/avif,image/gif,image/jpeg,image/png,image/webp,video/mp4,video/webm"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.currentTarget.value = "";
                if (file) {
                  uploadMediaAsset(file);
                }
              }}
            />
          </label>
          {mediaError ? (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              {mediaError}
            </p>
          ) : null}
          {mediaStatus ? (
            <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
              {mediaStatus}
            </p>
          ) : null}
          <div className="mt-4 space-y-2">
            {filteredMediaAssets.slice(0, 8).map((asset) => (
              <div
                key={asset.id}
                className="grid min-w-0 gap-3 rounded-md border border-slate-200 bg-white p-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {asset.kind === "image" ? (
                    <div
                      className="size-10 shrink-0 rounded bg-slate-100 bg-cover bg-center"
                      style={{ backgroundImage: `url("${asset.url}")` }}
                    />
                  ) : (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded bg-slate-950 text-white">
                      <Video className="size-4" aria-hidden />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-900">
                      {asset.originalFileName}
                    </p>
                    <p className="mt-0.5 text-xs uppercase text-slate-500">
                      {asset.kind} / {Math.ceil(asset.byteSize / 1024)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="subtle"
                    className="shrink-0"
                    onClick={() => attachMediaAsset(asset)}
                  >
                    <Plus className="size-3.5" aria-hidden />
                    Attach
                  </Button>
                </div>
                <label className="grid gap-1 text-xs font-medium text-slate-600">
                  Alt text
                  <input
                    aria-label={`Alt text for ${asset.originalFileName}`}
                    className="h-8 min-w-0 rounded-md border border-slate-200 px-2 text-xs font-normal"
                    value={asset.altText ?? ""}
                    onChange={(event) =>
                      updateMediaAssetDraft(asset.id, {
                        altText: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-slate-600">
                  Caption
                  <textarea
                    aria-label={`Caption for ${asset.originalFileName}`}
                    className="min-h-16 resize-y rounded-md border border-slate-200 px-2 py-1 text-xs font-normal leading-5"
                    value={asset.caption ?? ""}
                    onChange={(event) =>
                      updateMediaAssetDraft(asset.id, {
                        caption: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-slate-600">
                  Labels
                  <input
                    aria-label={`Labels for ${asset.originalFileName}`}
                    className="h-8 min-w-0 rounded-md border border-slate-200 px-2 text-xs font-normal"
                    placeholder="rag, architecture, final"
                    value={asset.labels.join(", ")}
                    onChange={(event) =>
                      updateMediaAssetDraft(asset.id, {
                        labels: normalizeCourseMediaLabels(
                          event.target.value.split(","),
                        ),
                      })
                    }
                  />
                </label>
                {asset.labels.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {asset.labels.map((label) => (
                      <span
                        key={label}
                        className="rounded border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 text-[11px] font-medium text-cyan-700"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isMediaPending}
                  onClick={() => saveMediaAssetMetadata(asset)}
                >
                  <Check className="size-3.5" aria-hidden />
                  Save media details
                </Button>
              </div>
            ))}
            {mediaAssets.length === 0 ? (
              <p className="text-sm leading-6 text-slate-500">
                Uploaded media will remain private to your authoring workspace
                until you attach it to a published course.
              </p>
            ) : null}
            {mediaAssets.length > 0 && filteredMediaAssets.length === 0 ? (
              <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-500">
                No media matches this search or filter.
              </p>
            ) : null}
          </div>
        </Panel>
      </aside>

      <main className="min-w-0" data-studio-mode="compose">
        <Panel>
          <SectionHeader
            title="Creator canvas"
            description="Structured authoring for documentation-grade lessons, runnable checkpoints, embeds, and notebook-backed courses."
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={status === "error" ? "amber" : "green"}>
                  <Check className="mr-1 size-3" aria-hidden />
                  {status === "saved"
                    ? `Saved ${autosavedAt}`
                    : status === "saving"
                      ? "Saving..."
                      : status === "dirty"
                        ? "Unsaved changes"
                        : status === "error"
                          ? "Save failed"
                          : "Draft ready"}
                </Badge>
                <Button onClick={() => persist("draft")} disabled={isPending}>
                  <Save className="size-4" aria-hidden />
                  Save draft
                </Button>
                <Button
                  variant="primary"
                  onClick={() => persist("published")}
                  disabled={isPending || publishBlocked}
                  title={
                    publishBlocked
                      ? "Resolve publish readiness checks first."
                      : "Publish course"
                  }
                >
                  <Sparkles className="size-4" aria-hidden />
                  Publish
                </Button>
              </div>
            }
          />

          <div className="grid gap-4 border-b border-slate-200 p-5 lg:grid-cols-[1fr_180px]">
            <div>
              <label
                className="text-xs font-medium uppercase text-slate-500"
                htmlFor="course-title"
              >
                Title
              </label>
              <textarea
                id="course-title"
                rows={2}
                className="mt-2 w-full resize-none bg-transparent text-3xl font-semibold leading-tight outline-none"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setStatus("dirty");
                }}
              />
              <textarea
                className="mt-3 w-full resize-none bg-transparent text-sm leading-6 text-slate-600 outline-none"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setStatus("dirty");
                }}
              />
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-medium uppercase text-slate-500">
                Difficulty
              </label>
              <select
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={difficulty}
                onChange={(event) => {
                  setDifficulty(
                    event.target.value as
                      | "beginner"
                      | "intermediate"
                      | "advanced",
                  );
                  setStatus("dirty");
                }}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <label className="block text-xs font-medium uppercase text-slate-500">
                Tags
              </label>
              <input
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={tags}
                onChange={(event) => {
                  setTags(event.target.value);
                  setStatus("dirty");
                }}
              />
            </div>
          </div>

          <div className="border-b border-slate-200 p-5">
            <label className="text-xs font-medium uppercase text-slate-500">
              Section title
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                className="min-w-0 flex-1 bg-transparent text-2xl font-semibold outline-none"
                value={selectedSection?.title ?? ""}
                onChange={(event) =>
                  updateSelectedSection({ title: event.target.value })
                }
              />
              <Button
                size="icon"
                aria-label="Move selected section up"
                onClick={() => moveSelectedSection("up")}
                disabled={
                  sections.findIndex(
                    (section) => section.clientId === selectedSectionId,
                  ) === 0
                }
              >
                <ArrowUp className="size-4" aria-hidden />
              </Button>
              <Button
                size="icon"
                aria-label="Move selected section down"
                onClick={() => moveSelectedSection("down")}
                disabled={
                  sections.findIndex(
                    (section) => section.clientId === selectedSectionId,
                  ) ===
                  sections.length - 1
                }
              >
                <ArrowDown className="size-4" aria-hidden />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run()
              }
            >
              <Heading1 className="size-4" aria-hidden />
              H2
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              <List className="size-4" aria-hidden />
              List
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            >
              <Braces className="size-4" aria-hidden />
              Code
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                editor
                  ?.chain()
                  .focus()
                  .setLink({ href: "https://example.dev" })
                  .run()
              }
            >
              <LinkIcon className="size-4" aria-hidden />
              Link
            </Button>
            <Button size="sm" variant="subtle" onClick={addExercise}>
              <Play className="size-4" aria-hidden />
              Runnable cell
            </Button>
          </div>

          <div className="prose prose-slate max-w-none p-5 [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:outline-none [&_pre]:rounded-lg [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-slate-100">
            <EditorContent editor={editor} />
          </div>

          <div className="space-y-4 border-t border-slate-200 bg-slate-50 p-5">
            <div>
              <label className="text-xs font-medium uppercase text-slate-500">
                Reference code
              </label>
              <textarea
                className="mt-2 min-h-36 w-full resize-y rounded-md border border-slate-200 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 outline-none"
                value={selectedSection?.code ?? ""}
                onChange={(event) =>
                  updateSelectedSection({ code: event.target.value })
                }
              />
            </div>
            <div>
              <label
                className="text-xs font-medium uppercase text-slate-500"
                htmlFor="course-resource-url"
              >
                Resources
              </label>
              <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  id="course-resource-url"
                  className="h-10 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm"
                  placeholder="https://youtube.com/watch?v=..., https://docs.dev/reference"
                  value={resourceUrl}
                  onChange={(event) => {
                    setResourceUrl(event.target.value);
                    setResourceError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addResource();
                    }
                  }}
                />
                <Button type="button" onClick={addResource}>
                  <Plus className="size-4" aria-hidden />
                  Add resource
                </Button>
              </div>
              {resourceError ? (
                <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {resourceError}
                </p>
              ) : null}
              {(selectedSection?.embeds.length ?? 0) > 0 ? (
                <div className="mt-3 grid gap-2">
                  {selectedSection?.embeds.map((embed) => {
                    const classified = classifyCourseEmbed(embed);
                    return (
                      <div
                        key={embed}
                        className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate text-slate-700">
                          <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium uppercase text-slate-500">
                            {classified?.type ?? "link"}
                          </span>
                          {classified?.label ?? embed}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Remove resource ${classified?.label ?? embed}`}
                          onClick={() => removeResource(embed)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <label
                  className="text-xs font-medium uppercase text-slate-500"
                  htmlFor="visualization-title"
                >
                  Visualization block
                </label>
                <Badge tone="blue">
                  {selectedSection?.visualizations.length ?? 0}
                </Badge>
              </div>
              <div className="mt-2 grid gap-2">
                <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)]">
                  <select
                    aria-label="Visualization type"
                    className="h-10 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={visualizationType}
                    onChange={(event) =>
                      setVisualizationType(
                        event.target.value as CourseVisualization["type"],
                      )
                    }
                  >
                    <option value="bar">Bar</option>
                    <option value="line">Line</option>
                    <option value="table">Table</option>
                  </select>
                  <input
                    id="visualization-title"
                    className="h-10 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={visualizationTitle}
                    onChange={(event) => {
                      setVisualizationTitle(event.target.value);
                      setVisualizationError(null);
                    }}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <textarea
                    aria-label="Visualization data"
                    className="min-h-20 resize-y rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-xs leading-5"
                    value={visualizationRows}
                    onChange={(event) => {
                      setVisualizationRows(event.target.value);
                      setVisualizationError(null);
                    }}
                  />
                  <Button type="button" onClick={addVisualization}>
                    {visualizationType === "line" ? (
                      <LineChart className="size-4" aria-hidden />
                    ) : visualizationType === "table" ? (
                      <Table2 className="size-4" aria-hidden />
                    ) : (
                      <BarChart3 className="size-4" aria-hidden />
                    )}
                    Add chart
                  </Button>
                </div>
              </div>
              {visualizationError ? (
                <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {visualizationError}
                </p>
              ) : null}
              {(selectedSection?.visualizations.length ?? 0) > 0 ? (
                <div className="mt-3 grid gap-2">
                  {selectedSection?.visualizations.map((visualization) => (
                    <div
                      key={visualization.id}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate text-slate-700">
                        <span className="mr-2 rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium uppercase text-emerald-700">
                          bar
                        </span>
                        {visualization.title} / {visualization.data.length} rows
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium uppercase text-slate-500">
                        {visualization.type}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove chart ${visualization.title}`}
                        onClick={() => removeVisualization(visualization.id)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </Panel>
      </main>

      <aside className="min-w-0 space-y-5">
        <Panel className="p-4" data-studio-mode="review">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Live preview</h2>
            <HelpTip>
              This preview checks the selected section only. The published
              reader renders the full course with table of contents, embeds,
              runner cells, and completion telemetry.
            </HelpTip>
          </div>
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase text-slate-500">
              {selectedSection?.title ?? "Untitled section"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {selectedSection?.body}
            </p>
            {selectedSection?.code ? (
              <pre className="mt-3 max-h-36 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
                <code>{selectedSection.code}</code>
              </pre>
            ) : null}
            {selectedExercises.length > 0 ? (
              <div className="mt-3 rounded-md bg-blue-50 p-2 text-xs text-blue-800">
                {selectedExercises.length} runnable checkpoint
                {selectedExercises.length === 1 ? "" : "s"} attached.
              </div>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-4" data-studio-mode="review">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Version history</h2>
              <HelpTip>
                Every draft save creates an immutable restore point. Compare a
                restore point before rolling the canvas back.
              </HelpTip>
            </div>
            <Badge tone="slate">{revisionEvents.length}</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {revisionEvents.length > 0 ? (
              revisionEvents.slice(0, 5).map((revision) => (
                <div
                  key={revision.id}
                  className="rounded-md border border-slate-200 bg-white p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        v{revision.revisionNumber} restore point
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-600">
                        {revision.snapshot.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTime(revision.createdAt, locale)}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {revision.snapshot.sections.length} sections /{" "}
                        {revision.snapshot.exercises.length} checks
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="subtle"
                      className="shrink-0"
                      onClick={() => setCompareRevisionId(revision.id)}
                    >
                      <GitCompare className="size-3.5" aria-hidden />
                      Compare
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="subtle"
                      className="shrink-0"
                      onClick={() => restoreRevision(revision)}
                    >
                      <RotateCcw className="size-3.5" aria-hidden />
                      Restore v{revision.revisionNumber}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-slate-500">
                Each save creates an immutable restore point for this course.
              </p>
            )}
            {compareRevision ? (
              <div className="rounded-md border border-cyan-200 bg-cyan-50 p-3 text-xs text-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-900">
                    Comparing v{compareRevision.revisionNumber}
                  </p>
                  <button
                    type="button"
                    className="rounded p-1 text-slate-500 hover:bg-white"
                    aria-label="Close revision comparison"
                    onClick={() => setCompareRevisionId(null)}
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-2">
                  {revisionDiff(compareRevision, {
                    title,
                    sections,
                    exercises,
                    charts: currentCharts,
                    embeds: currentEmbeds,
                  }).map((item) => (
                    <div key={item.label} className="rounded bg-white p-2">
                      <dt className="text-[11px] uppercase text-slate-500">
                        {item.label}
                      </dt>
                      <dd className="mt-1 font-mono text-[11px]">
                        {item.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Runnable checkpoints</h2>
            <Badge tone="blue">{selectedExercises.length}</Badge>
          </div>
          <div className="mt-4 space-y-4">
            {selectedExercises.map((exercise) => (
              <div
                key={exercise.id}
                className="rounded-lg border border-slate-200 bg-white p-3"
              >
                <label className="text-xs font-medium uppercase text-slate-500">
                  Prompt
                </label>
                <textarea
                  className="mt-1 min-h-16 w-full resize-y bg-transparent text-sm outline-none"
                  value={exercise.prompt}
                  onChange={(event) =>
                    updateExercise(exercise.id, { prompt: event.target.value })
                  }
                />
                <label className="mt-3 block text-xs font-medium uppercase text-slate-500">
                  Starter
                </label>
                <textarea
                  className="mt-1 min-h-24 w-full resize-y rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-100 outline-none"
                  value={exercise.starterCode}
                  onChange={(event) =>
                    updateExercise(exercise.id, {
                      starterCode: event.target.value,
                    })
                  }
                />
                <label className="mt-3 block text-xs font-medium uppercase text-slate-500">
                  Assertion
                </label>
                <textarea
                  className="mt-1 min-h-20 w-full resize-y rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-100 outline-none"
                  value={exercise.assertionCode}
                  onChange={(event) =>
                    updateExercise(exercise.id, {
                      assertionCode: event.target.value,
                    })
                  }
                />
                <label className="mt-3 block text-xs font-medium uppercase text-slate-500">
                  Success message
                </label>
                <input
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
                  value={exercise.successMessage}
                  onChange={(event) =>
                    updateExercise(exercise.id, {
                      successMessage: event.target.value,
                    })
                  }
                />
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-4" data-studio-mode="publish">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Publishing readiness</h2>
            <HelpTip>
              Publishing is blocked until required content quality checks pass.
              Draft autosave and restore points continue to work while blocked.
            </HelpTip>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>Sections: {sections.length}</li>
            <li>Runnable checks: {exercises.length}</li>
            <li>Notebook metadata: {notebook ? "attached" : "optional"}</li>
            <li>
              Embeds: {sections.flatMap((section) => section.embeds).length}
            </li>
            <li>
              Charts:{" "}
              {sections.flatMap((section) => section.visualizations).length}
            </li>
            <li>No public negative counters in course engagement.</li>
          </ul>
          <div className="mt-4 space-y-2">
            {publishChecks.map((check) => (
              <div
                key={check.label}
                className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${
                  check.passed
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                {check.passed ? (
                  <Check className="size-3.5" aria-hidden />
                ) : (
                  <PenLine className="size-3.5" aria-hidden />
                )}
                <span>{check.label}</span>
              </div>
            ))}
          </div>
          {notebook?.colabUrl ? (
            <a
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-700"
              href={notebook.colabUrl}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="size-4" aria-hidden />
              Open Colab target
            </a>
          ) : null}
        </Panel>
      </aside>
    </div>
  );
}
