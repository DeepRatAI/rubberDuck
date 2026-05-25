import type { CourseDetail } from "./product-types";

type NotebookCell =
  | {
      cell_type: "markdown";
      metadata: Record<string, unknown>;
      source: string[];
    }
  | {
      cell_type: "code";
      execution_count: null;
      metadata: Record<string, unknown>;
      outputs: unknown[];
      source: string[];
    };

export type ExportedNotebook = {
  cells: NotebookCell[];
  metadata: {
    kernelspec: {
      display_name: string;
      language: string;
      name: string;
    };
    language_info: {
      name: string;
    };
    devit: {
      courseId: string;
      slug: string;
      title: string;
      exportedAt: string;
      execution: {
        browser: {
          engine: "pyodide";
          hardware: "wasm-cpu";
          packageLoading: "auto-from-imports";
        };
        gpu: {
          mode: "colab-handoff";
          provider: "google-colab";
          userRuntimeRequired: true;
        };
      };
    };
  };
  nbformat: 4;
  nbformat_minor: 5;
};

function notebookLines(value: string) {
  const lines = value.split("\n");
  return lines.map((line, index) =>
    index < lines.length - 1 ? `${line}\n` : line,
  );
}

function markdownCell(source: string[]): NotebookCell {
  return {
    cell_type: "markdown",
    metadata: {},
    source,
  };
}

function codeCell(
  source: string,
  metadata: Record<string, unknown> = {},
): NotebookCell {
  return {
    cell_type: "code",
    execution_count: null,
    metadata,
    outputs: [],
    source: notebookLines(source),
  };
}

export function buildNotebookFileName(course: Pick<CourseDetail, "slug">) {
  const safeSlug = course.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${safeSlug || "rubberduck-course"}.ipynb`;
}

export function buildCourseNotebook(
  course: CourseDetail,
  exportedAt = new Date(),
): ExportedNotebook {
  const cells: NotebookCell[] = [
    markdownCell([
      `# ${course.title}\n`,
      "\n",
      `${course.description}\n`,
      "\n",
      `**Creator:** ${course.creatorName}\n`,
      "\n",
      `**Tags:** ${course.tags.join(", ")}\n`,
      "\n",
      `**Difficulty:** ${course.difficulty}`,
    ]),
  ];

  for (const section of course.sections) {
    const sectionSource = [`## ${section.title}\n`, "\n", `${section.body}\n`];

    if (section.embeds.length > 0) {
      sectionSource.push("\n", "Resources:\n");
      sectionSource.push(...section.embeds.map((embed) => `- ${embed}\n`));
    }

    if (section.visualizations.length > 0) {
      sectionSource.push("\n\n", "Visualizations:\n");
      for (const visualization of section.visualizations) {
        sectionSource.push(
          `- ${visualization.title} (${visualization.type})\n`,
        );
        sectionSource.push(
          ...visualization.data.map(
            (datum) => `  - ${datum.label}: ${datum.value}\n`,
          ),
        );
      }
    }

    cells.push(markdownCell(sectionSource));

    if (section.code?.trim()) {
      cells.push(codeCell(section.code.trim()));
    }

    for (const exercise of course.exercises.filter(
      (candidate) => candidate.sectionId === section.id,
    )) {
      cells.push(
        codeCell(exercise.starterCode.trim(), {
          devit: {
            exercise: true,
            prompt: exercise.prompt,
            assertionCode: exercise.assertionCode,
            successMessage: exercise.successMessage,
          },
        }),
      );
    }
  }

  return {
    cells,
    metadata: {
      kernelspec: {
        display_name: "Python 3",
        language: "python",
        name: "python3",
      },
      language_info: {
        name: "python",
      },
      devit: {
        courseId: course.id,
        slug: course.slug,
        title: course.title,
        exportedAt: exportedAt.toISOString(),
        execution: {
          browser: {
            engine: "pyodide",
            hardware: "wasm-cpu",
            packageLoading: "auto-from-imports",
          },
          gpu: {
            mode: "colab-handoff",
            provider: "google-colab",
            userRuntimeRequired: true,
          },
        },
      },
    },
    nbformat: 4,
    nbformat_minor: 5,
  };
}
