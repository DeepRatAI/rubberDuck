import { describe, expect, it } from "vitest";

import {
  createProjectSignalResponseNotification,
  getProjectSignalResponseCopy,
  uniqueProjectSignalResponses,
} from "./project-signal-actions";

describe("Project Signal response actions", () => {
  it("provides localized action labels and completed-state copy", () => {
    expect(getProjectSignalResponseCopy("try", "en")).toMatchObject({
      label: "I can test it",
      pastTense: "Testing offered",
    });
    expect(getProjectSignalResponseCopy("contribute", "es")).toMatchObject({
      label: "Puedo contribuir",
      pastTense: "Contribución ofrecida",
    });
  });

  it("builds private notification messages without exposing public counters", () => {
    expect(
      createProjectSignalResponseNotification({
        actorName: "Mina Park",
        repoLabel: "DeepRatAI/Dev4All",
        intent: "review",
      }),
    ).toBe("Mina Park offered to review DeepRatAI/Dev4All.");
  });

  it("deduplicates and orders persisted response intents by product priority", () => {
    expect(
      uniqueProjectSignalResponses(["contribute", "try", "try", "review"]),
    ).toEqual(["try", "review", "contribute"]);
  });
});
