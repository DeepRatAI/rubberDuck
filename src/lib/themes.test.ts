import { describe, expect, it } from "vitest";

import { contrastRatio, validateCommunityTheme } from "./themes";

describe("theme validation", () => {
  it("accepts attributed community themes with accessible contrast", () => {
    const result = validateCommunityTheme({
      label: "Blueprint Duck",
      description: "A calm blueprint-inspired maker theme.",
      creator: "Mina Park",
      creatorHandle: "@minapark",
      mode: "light",
      palette: ["#FCFCFF", "#102A43", "#FFD447", "#FF9F1C"],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.theme.id).toBe("community:minapark:blueprint-duck");
      expect(result.theme.creatorHandle).toBe("@minapark");
    }
  });

  it("rejects invalid palettes and unattributed themes", () => {
    const result = validateCommunityTheme({
      label: "x",
      description: "too short",
      creator: "Anonymous",
      creatorHandle: "anonymous",
      mode: "dark",
      palette: ["yellow", "#FFFFFE", "#FFFFFD", "#FFFFFC"],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("Creator handle");
      expect(result.errors.join(" ")).toContain("6-digit hex");
    }
  });

  it("calculates WCAG contrast ratios for future theme moderation", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 1);
    expect(contrastRatio("#FCFCFF", "#102A43")).toBeGreaterThan(12);
  });
});
