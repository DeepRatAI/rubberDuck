import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SafeMarkdown } from "./markdown";

describe("SafeMarkdown", () => {
  it("renders safe links, code blocks, and spoiler details", () => {
    render(
      <SafeMarkdown
        value={[
          "Read [docs](https://example.com).",
          "",
          "```ts",
          "const ok = true",
          "```",
          "",
          "<details><summary>Spoiler</summary>",
          "",
          "Hidden implementation note.",
          "",
          "</details>",
        ].join("\n")}
      />,
    );

    expect(screen.getByRole("link", { name: "docs" })).toHaveAttribute(
      "rel",
      "noreferrer",
    );
    expect(screen.getByText("const ok = true")).toBeVisible();
    expect(screen.getByText("Spoiler")).toBeVisible();
    expect(screen.getByText("Hidden implementation note.")).toBeInTheDocument();
  });

  it("does not render unsafe scripts from user content", () => {
    render(<SafeMarkdown value={'<script>alert("xss")</script>Visible'} />);

    expect(screen.queryByText('alert("xss")')).not.toBeInTheDocument();
    expect(screen.getByText("Visible")).toBeVisible();
  });
});
