import { z } from "zod";

export const courseVisualizationDatumSchema = z.object({
  label: z.string().trim().min(1).max(48),
  value: z.number().finite().min(0).max(1_000_000),
});

export const courseVisualizationSchema = z.object({
  id: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-zA-Z0-9_-]+$/),
  type: z.enum(["bar", "line", "table"]),
  title: z.string().trim().min(3).max(120),
  xLabel: z.string().trim().max(80).optional(),
  yLabel: z.string().trim().max(80).optional(),
  data: z.array(courseVisualizationDatumSchema).min(1).max(12),
});

export type CourseVisualizationDatum = z.infer<
  typeof courseVisualizationDatumSchema
>;

export type CourseVisualization = z.infer<typeof courseVisualizationSchema>;

export type VisualizationRowsResult =
  | {
      data: CourseVisualizationDatum[];
      error: null;
    }
  | {
      data: [];
      error: string;
    };

function normalizeValue(value: number) {
  return Math.round(value * 100) / 100;
}

export function parseVisualizationRows(input: string): VisualizationRowsResult {
  const rows = input
    .split("\n")
    .map((row) => row.trim())
    .filter(Boolean);

  if (rows.length === 0) {
    return {
      data: [],
      error: 'Add at least one "label, value" row.',
    };
  }

  if (rows.length > 12) {
    return {
      data: [],
      error: "Visualizations support up to 12 rows.",
    };
  }

  const data: CourseVisualizationDatum[] = [];

  for (const row of rows) {
    const separatorIndex = row.search(/[:,]/);

    if (separatorIndex <= 0) {
      return {
        data: [],
        error: 'Use one "label, value" pair per line.',
      };
    }

    const label = row.slice(0, separatorIndex).trim();
    const rawValue = row.slice(separatorIndex + 1).trim();
    const value = Number(rawValue);

    if (!label || label.length > 48) {
      return {
        data: [],
        error: "Visualization labels must be 1-48 characters.",
      };
    }

    if (!Number.isFinite(value) || value < 0 || value > 1_000_000) {
      return {
        data: [],
        error: "Visualization values must be finite numbers from 0 to 1000000.",
      };
    }

    data.push({ label, value: normalizeValue(value) });
  }

  return { data, error: null };
}

export function sanitizeVisualizations(raw: unknown): CourseVisualization[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((candidate) => courseVisualizationSchema.safeParse(candidate))
    .filter((result): result is z.ZodSafeParseSuccess<CourseVisualization> =>
      Boolean(result.success),
    )
    .map((result) => result.data)
    .slice(0, 6);
}
