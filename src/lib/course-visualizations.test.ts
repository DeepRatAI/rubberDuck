import { describe, expect, it } from "vitest";

import {
  parseVisualizationRows,
  sanitizeVisualizations,
} from "./course-visualizations";

describe("course visualizations", () => {
  it("parses safe chart rows from compact author input", () => {
    expect(
      parseVisualizationRows("Retrieval recall, 86.125\nCitation accuracy: 94"),
    ).toEqual({
      data: [
        { label: "Retrieval recall", value: 86.13 },
        { label: "Citation accuracy", value: 94 },
      ],
      error: null,
    });
  });

  it("rejects malformed chart rows and unsafe numeric ranges", () => {
    expect(parseVisualizationRows("Only label")).toMatchObject({
      data: [],
      error: 'Use one "label, value" pair per line.',
    });
    expect(parseVisualizationRows("Latency, Infinity")).toMatchObject({
      data: [],
      error: "Visualization values must be finite numbers from 0 to 1000000.",
    });
    expect(parseVisualizationRows("Budget, -1")).toMatchObject({
      data: [],
      error: "Visualization values must be finite numbers from 0 to 1000000.",
    });
  });

  it("sanitizes persisted visualization JSON before rendering", () => {
    expect(
      sanitizeVisualizations([
        {
          id: "quality-gates",
          type: "bar",
          title: "Quality gates",
          data: [{ label: "Recall", value: 86 }],
        },
        {
          id: "latency-trend",
          type: "line",
          title: "Latency trend",
          data: [
            { label: "P50", value: 120 },
            { label: "P95", value: 240 },
          ],
        },
        {
          id: "eval-table",
          type: "table",
          title: "Eval table",
          data: [{ label: "Citation accuracy", value: 94 }],
        },
        {
          id: "bad",
          type: "scatter",
          title: "Unsupported",
          data: [{ label: "Recall", value: 86 }],
        },
      ]),
    ).toEqual([
      {
        id: "quality-gates",
        type: "bar",
        title: "Quality gates",
        data: [{ label: "Recall", value: 86 }],
      },
      {
        id: "latency-trend",
        type: "line",
        title: "Latency trend",
        data: [
          { label: "P50", value: 120 },
          { label: "P95", value: 240 },
        ],
      },
      {
        id: "eval-table",
        type: "table",
        title: "Eval table",
        data: [{ label: "Citation accuracy", value: 94 }],
      },
    ]);
  });
});
