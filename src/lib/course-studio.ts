import type { NotebookMetadata } from "./product-types";
import { classifyCourseEmbed } from "./course-embeds";
import type { CourseRevisionSnapshot } from "./course-revisions";
import type { CourseVisualization } from "./course-visualizations";

export type StudioSection = {
  clientId: string;
  title: string;
  body: string;
  code: string;
  embeds: string[];
  visualizations: CourseVisualization[];
};

export type StudioExercise = {
  id: string;
  sectionClientId: string;
  prompt: string;
  starterCode: string;
  assertionCode: string;
  successMessage: string;
};

export type CourseStudioPayloadInput = {
  draftId?: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  status: "draft" | "published";
  tagsInput: string;
  content: unknown;
  sections: StudioSection[];
  exercises: StudioExercise[];
  notebook: NotebookMetadata | null;
};

export type StudioEmbedChange = {
  embeds: string[];
  error: string | null;
};

export type RestoredCourseStudioState = {
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  tagsInput: string;
  sections: StudioSection[];
  exercises: StudioExercise[];
  notebook: NotebookMetadata | null;
};

export type NotebookCellMapping = {
  index: number;
  kind: "section" | "markdown" | "reference_code" | "exercise";
  title: string;
  targetSectionClientId: string | null;
};

export type NotebookStudioImport = {
  metadata: NotebookMetadata;
  sections: StudioSection[];
  exercises: StudioExercise[];
  cellMap: NotebookCellMapping[];
};

type NotebookCell = {
  cell_type?: string;
  source?: string | string[];
  metadata?: {
    devit?: {
      exercise?: boolean;
      prompt?: string;
      assertionCode?: string;
      successMessage?: string;
    };
  };
};

type NotebookDocument = {
  metadata?: {
    kernelspec?: {
      language?: string;
      name?: string;
    };
    language_info?: {
      name?: string;
    };
  };
  cells?: NotebookCell[];
};

function notebookSource(cell: NotebookCell) {
  return Array.isArray(cell.source)
    ? cell.source.join("")
    : (cell.source ?? "");
}

function normalizeTag(value: string) {
  return value.trim().replace(/^#/, "").toLowerCase();
}

export function addStudioEmbed(
  embeds: string[],
  rawUrl: string,
): StudioEmbedChange {
  const classified = classifyCourseEmbed(rawUrl.trim());

  if (!classified) {
    return {
      embeds,
      error: "Enter a valid http(s) URL.",
    };
  }

  if (embeds.includes(classified.url)) {
    return {
      embeds,
      error: "Resource already attached.",
    };
  }

  return {
    embeds: [...embeds, classified.url],
    error: null,
  };
}

export function removeStudioEmbed(embeds: string[], url: string) {
  return embeds.filter((embed) => embed !== url);
}

function slugClientId(value: string, fallback: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return slug || fallback;
}

function markdownHeading(value: string) {
  const firstLine = value
    .split("\n")
    .find((line) => line.trim())
    ?.trim();

  if (!firstLine?.startsWith("#")) {
    return null;
  }

  return firstLine.replace(/^#+\s*/, "").slice(0, 160);
}

function markdownBodyWithoutHeading(value: string) {
  const lines = value.split("\n");
  const firstContentIndex = lines.findIndex((line) => line.trim());

  if (
    firstContentIndex >= 0 &&
    lines[firstContentIndex]?.trim().startsWith("#")
  ) {
    return lines
      .slice(firstContentIndex + 1)
      .join("\n")
      .trim();
  }

  return value.trim();
}

export function parseNotebookMetadata(
  fileName: string,
  rawNotebook: string,
): NotebookMetadata {
  const parsed = JSON.parse(rawNotebook) as NotebookDocument;
  const cells = Array.isArray(parsed.cells) ? parsed.cells : [];
  const outline = cells
    .flatMap((cell) => {
      const firstLine = notebookSource(cell)
        .split("\n")
        .find((line) => line.trim());

      if (!firstLine) {
        return [];
      }

      const trimmed = firstLine.trim();

      if (cell.cell_type === "markdown" && trimmed.startsWith("#")) {
        return trimmed.replace(/^#+\s*/, "").slice(0, 160);
      }

      if (cell.cell_type === "code") {
        return trimmed.slice(0, 160);
      }

      return [];
    })
    .slice(0, 80);

  return {
    fileName,
    cellCount: cells.length,
    language:
      parsed.metadata?.kernelspec?.language ??
      parsed.metadata?.language_info?.name ??
      parsed.metadata?.kernelspec?.name ??
      "python",
    outline,
    colabUrl: "https://colab.research.google.com/",
  };
}

export function importNotebookToStudio(
  fileName: string,
  rawNotebook: string,
): NotebookStudioImport {
  const parsed = JSON.parse(rawNotebook) as NotebookDocument;
  const metadata = parseNotebookMetadata(fileName, rawNotebook);
  const cells = Array.isArray(parsed.cells) ? parsed.cells : [];
  const sections: StudioSection[] = [];
  const exercises: StudioExercise[] = [];
  const cellMap: NotebookCellMapping[] = [];
  const clientIds = new Set<string>();

  function uniqueClientId(value: string, fallback: string) {
    const base = slugClientId(value, fallback);
    let candidate = base;
    let suffix = 2;

    while (clientIds.has(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    clientIds.add(candidate);
    return candidate;
  }

  function ensureSection() {
    const existing = sections.at(-1);
    if (existing) {
      return existing;
    }

    const fallback: StudioSection = {
      clientId: uniqueClientId("notebook-introduction", "notebook-section"),
      title: "Notebook introduction",
      body: "Imported notebook content.",
      code: "",
      embeds: ["https://colab.research.google.com/"],
      visualizations: [],
    };
    sections.push(fallback);
    return fallback;
  }

  for (const [index, cell] of cells.entries()) {
    const source = notebookSource(cell).trim();
    if (!source) {
      continue;
    }

    if (cell.cell_type === "markdown") {
      const heading = markdownHeading(source);

      if (heading) {
        const clientId = uniqueClientId(
          heading,
          `notebook-section-${index + 1}`,
        );
        sections.push({
          clientId,
          title: heading,
          body:
            markdownBodyWithoutHeading(source) ||
            "Imported notebook section. Add explanation before publishing.",
          code: "",
          embeds: ["https://colab.research.google.com/"],
          visualizations: [],
        });
        cellMap.push({
          index,
          kind: "section",
          title: heading,
          targetSectionClientId: clientId,
        });
      } else {
        const section = ensureSection();
        section.body = [section.body, source].filter(Boolean).join("\n\n");
        cellMap.push({
          index,
          kind: "markdown",
          title: source.split("\n").find(Boolean)?.slice(0, 80) ?? "Markdown",
          targetSectionClientId: section.clientId,
        });
      }

      continue;
    }

    if (cell.cell_type === "code") {
      const section = ensureSection();
      const devit = cell.metadata?.devit;

      if (devit?.exercise) {
        const exerciseId = `notebook-exercise-${index + 1}`;
        exercises.push({
          id: exerciseId,
          sectionClientId: section.clientId,
          prompt: devit.prompt ?? "Complete the notebook checkpoint.",
          starterCode: source,
          assertionCode: devit.assertionCode ?? "assert True",
          successMessage: devit.successMessage ?? "Checkpoint passed.",
        });
        cellMap.push({
          index,
          kind: "exercise",
          title:
            devit.prompt ?? source.split("\n")[0]?.slice(0, 80) ?? "Exercise",
          targetSectionClientId: section.clientId,
        });
      } else {
        section.code = [section.code, source].filter(Boolean).join("\n\n");
        cellMap.push({
          index,
          kind: "reference_code",
          title: source.split("\n")[0]?.slice(0, 80) ?? "Code",
          targetSectionClientId: section.clientId,
        });
      }
    }
  }

  return { metadata, sections, exercises, cellMap };
}

export function buildCourseStudioPayload(input: CourseStudioPayloadInput) {
  const tags = Array.from(
    new Set(input.tagsInput.split(",").map(normalizeTag).filter(Boolean)),
  );

  return {
    draftId: input.draftId,
    title: input.title.trim(),
    description: input.description.trim(),
    difficulty: input.difficulty,
    status: input.status,
    tags,
    content: input.content,
    sections: input.sections,
    exercises: input.exercises.map((exercise) => ({
      sectionClientId: exercise.sectionClientId,
      prompt: exercise.prompt,
      starterCode: exercise.starterCode,
      assertionCode: exercise.assertionCode,
      successMessage: exercise.successMessage,
    })),
    ipynbMetadata: input.notebook,
  };
}

export function restoreSnapshotToStudio(
  snapshot: CourseRevisionSnapshot,
): RestoredCourseStudioState {
  return {
    title: snapshot.title,
    description: snapshot.description,
    difficulty: snapshot.difficulty,
    tagsInput: snapshot.tags.join(", "),
    sections: snapshot.sections.map((section) => ({
      clientId: section.clientId,
      title: section.title,
      body: section.body,
      code: section.code ?? "",
      embeds: [...section.embeds],
      visualizations: section.visualizations.map((visualization) => ({
        ...visualization,
        data: visualization.data.map((datum) => ({ ...datum })),
      })),
    })),
    exercises: snapshot.exercises.map((exercise, index) => ({
      id: `restored-exercise-${index + 1}`,
      sectionClientId: exercise.sectionClientId,
      prompt: exercise.prompt,
      starterCode: exercise.starterCode,
      assertionCode: exercise.assertionCode,
      successMessage: exercise.successMessage,
    })),
    notebook: snapshot.ipynbMetadata ?? null,
  };
}

export function moveStudioSection(
  sections: StudioSection[],
  sectionId: string,
  direction: "up" | "down",
) {
  const index = sections.findIndex((section) => section.clientId === sectionId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (index < 0 || targetIndex < 0 || targetIndex >= sections.length) {
    return sections;
  }

  const next = [...sections];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}
