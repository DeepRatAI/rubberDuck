import { expect, test } from "@playwright/test";

test("landing exposes the product and bilingual navigation", async ({
  page,
}) => {
  await page.goto("/?lang=es", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: /red social open-source/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /unirse a rubberduck/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /explorar bitácora/i }),
  ).toBeVisible();
});

test("binnacle feed filters technical posts and excludes rejection counters", async ({
  page,
}) => {
  await page.goto("/binnacle?lang=en", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: "Binnacle" }).first(),
  ).toBeVisible();
  const title = `Testing social loops ${Date.now()}`;
  await page.getByPlaceholder("Post title").fill(title);
  await page
    .getByPlaceholder(/Share a project update/i)
    .fill("Shipping a persisted Binnacle post from the E2E flow.");
  await page.getByLabel("Post tags").fill("testing, social");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Binnacle post published.")).toBeVisible();
  const createdPost = page
    .locator("article")
    .filter({ hasText: title })
    .first();
  await expect(createdPost).toBeVisible();
  const editedTitle = `${title} edited`;
  await createdPost.getByRole("button", { name: "Edit" }).click();
  await createdPost.getByLabel("Edit title").fill(editedTitle);
  await createdPost
    .getByLabel("Edit body")
    .fill("Shipping an edited persisted Binnacle post from the E2E flow.");
  await createdPost.getByRole("button", { name: "Save edit" }).click();
  await expect(page.getByText("Post updated.")).toBeVisible();
  await expect(page.getByRole("link", { name: editedTitle })).toBeVisible();
  await createdPost.getByRole("button", { name: /Save/i }).click();
  await expect(page.getByText("Post saved.")).toBeVisible();
  await createdPost.getByRole("button", { name: /Report/i }).click();
  await expect(page.getByText("Report sent privately.")).toBeVisible();
  await createdPost.getByRole("link", { name: editedTitle }).click();
  await page.getByLabel("Add a technical reply").fill("Confirmed from E2E.");
  await page.getByRole("button", { name: "Reply" }).click();
  await expect(page.getByText("Reply published.")).toBeVisible();
  await page.getByRole("button", { name: "Edit" }).first().click();
  await page.getByLabel("Edit comment").fill("Confirmed from edited E2E.");
  await page.getByRole("button", { name: "Save edit" }).click();
  await expect(page.getByText("Comment updated.")).toBeVisible();
  await expect(page.getByText("Confirmed from edited E2E.")).toBeVisible();
  await page.goto("/binnacle?lang=en", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder(/search/i).fill("#postgres");
  await expect(
    page.getByText("How would you structure a multi-deployable monorepo?"),
  ).toBeVisible();
  await expect(page.getByText(/downvote/i)).toHaveCount(0);
  await expect(page.getByText(/dislike/i)).toHaveCount(0);
});

test("course reader exposes notebook execution controls", async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(90_000);

  await page.goto("/courses/building-an-llm-app-with-rag?lang=en", {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.locator("h1", { hasText: "Building an LLM App with RAG" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Run$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Thanks \d+/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Saved" })).toBeDisabled();
  await expect(
    page.getByText(/Completion requires every section viewed|Course complete/i),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "RAG quality gates bar chart" }),
  ).toBeVisible();
  await expect(page.getByText("Citation accuracy")).toBeVisible();
  await expect(page.getByRole("link", { name: /Export/i })).toHaveAttribute(
    "href",
    "/api/courses/building-an-llm-app-with-rag/export",
  );
  const response = await request.get(
    "/api/courses/building-an-llm-app-with-rag/export",
  );
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-disposition"]).toContain(
    'filename="building-an-llm-app-with-rag.ipynb"',
  );
  const notebook = (await response.json()) as {
    cells: Array<{ metadata?: { devit?: { exercise?: boolean } } }>;
    metadata: { devit: { slug: string } };
  };
  expect(notebook.metadata.devit.slug).toBe("building-an-llm-app-with-rag");
  expect(
    notebook.cells.some((cell) => cell.metadata?.devit?.exercise === true),
  ).toBe(true);
  await page.getByRole("button", { name: /^Run$/ }).first().click();
  await expect(page.getByText(/Python execution failed/i)).toBeVisible({
    timeout: 60000,
  });
  await expect(page.getByText(/AssertionError/i)).toBeVisible();
  await page
    .locator("textarea")
    .filter({ hasText: "answer = ''" })
    .first()
    .fill("answer = 'Source: docs'\nprint(answer)");
  await page.getByRole("button", { name: /^Run$/ }).first().click();
  await expect(
    page.getByText(/Grounded answer detected with source attribution/i),
  ).toBeVisible({ timeout: 20000 });
  await expect(page.locator("pre", { hasText: "Source: docs" })).toBeVisible();

  if (testInfo.project.name === "chromium") {
    await page
      .locator("textarea")
      .first()
      .fill(
        [
          "import numpy as np",
          "",
          "docs = np.array([",
          "    [1.0, 0.1, 0.0],",
          "    [0.2, 1.0, 0.4],",
          "    [0.0, 0.3, 1.0],",
          "])",
          "query = np.array([0.1, 0.9, 0.2])",
          "scores = docs @ query / (np.linalg.norm(docs, axis=1) * np.linalg.norm(query))",
          "winner = int(np.argmax(scores))",
          "answer = f'Source: doc-{winner + 1}'",
          "print('cosine_scores=' + ','.join(f'{score:.3f}' for score in scores))",
          "print('winner=doc-' + str(winner + 1))",
          "print(answer)",
        ].join("\n"),
      );
    await page.getByRole("button", { name: /^Run$/ }).first().click();
    await expect(
      page.getByText(/Grounded answer detected with source attribution/i),
    ).toBeVisible({ timeout: 30000 });
    await expect(
      page.locator("pre", { hasText: "cosine_scores=" }),
    ).toBeVisible();
    await expect(
      page.locator("pre", { hasText: "winner=doc-2" }),
    ).toBeVisible();
  }
});

test("course studio saves structured drafts with runnable checkpoints", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  const mediaFileName = `rag-architecture-${testInfo.project.name}-${Date.now()}.png`;
  const mediaSearchTerm = mediaFileName.replace(".png", "");

  await page.goto("/courses/new?lang=en", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: "Course Studio" }),
  ).toBeVisible();
  await expect(page.getByTestId("studio-hydrated")).toBeAttached({
    timeout: 20_000,
  });
  await expect(page.getByRole("tab", { name: /Compose/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Notebook/i })).toBeVisible();
  await page.getByRole("button", { name: "Walkthrough" }).click();
  const walkthrough = page.getByRole("dialog");
  await expect(walkthrough).toBeVisible();
  await walkthrough.getByRole("button", { name: "Next", exact: true }).click();
  await walkthrough.getByRole("button", { name: "Close walkthrough" }).click();
  await page.getByRole("tab", { name: /Notebook/i }).click();
  await page.getByRole("tab", { name: /Media/i }).click();
  await page.getByRole("button", { name: /Review launch/i }).click();
  await expect(page.getByText("Publishing readiness")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Runnable checkpoints" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Live preview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add section" }).click();
  await expect(
    page.getByRole("button", { name: /3\. Section 3/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Move Section 3 up/i }).click();
  await expect(
    page.getByRole("button", { name: /2\. Section 3/i }),
  ).toBeVisible();
  await page.getByLabel("Title").fill("Building Reliable Agent Tools v2");
  await expect(page.getByText("Unsaved changes")).toBeVisible();
  await page.getByLabel("Resources").fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Add resource" }).click();
  await expect(page.getByText("Enter a valid http(s) URL.")).toBeVisible();
  await page
    .getByLabel("Resources")
    .fill("https://www.youtube.com/watch?v=abc123XYZ");
  await page.getByRole("button", { name: "Add resource" }).click();
  await expect(page.getByText("YouTube")).toBeVisible();
  await page
    .getByLabel("Resources")
    .fill("https://www.youtube.com/watch?v=abc123XYZ");
  await page.getByRole("button", { name: "Add resource" }).click();
  await expect(page.getByText("Resource already attached.")).toBeVisible();
  await page.setInputFiles('input[accept*="image/png"]', {
    name: mediaFileName,
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADgwGOnkP2UQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await expect(page.getByText(mediaFileName).first()).toBeVisible({
    timeout: 15000,
  });
  await page
    .getByLabel(`Alt text for ${mediaFileName}`)
    .first()
    .fill("RAG architecture diagram");
  await page
    .getByLabel(`Caption for ${mediaFileName}`)
    .first()
    .fill("Retrieval flow used by the runnable lesson.");
  await page
    .getByLabel(`Labels for ${mediaFileName}`)
    .first()
    .fill("architecture, rag, final");
  await page
    .getByRole("button", { name: "Save media details" })
    .first()
    .click();
  await expect(
    page.getByText(`${mediaFileName} details saved.`).first(),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page
      .locator("span")
      .filter({ hasText: /^architecture$/ })
      .first(),
  ).toBeVisible();
  await page.getByLabel("Media label filter").selectOption("rag");
  await page.getByLabel("Search media library").fill(mediaSearchTerm);
  await expect(page.getByText("Showing 1 of")).toBeVisible();
  await expect(page.getByText(mediaFileName).first()).toBeVisible();
  await page.getByLabel("Media label filter").selectOption("all");
  await page.getByLabel("Search media library").fill(mediaSearchTerm);
  await expect(page.getByText("Showing 1 of")).toBeVisible();
  await expect(page.getByText(mediaFileName).first()).toBeVisible();
  await page.getByLabel("Search media library").fill("does-not-exist");
  await expect(
    page.getByText("No media matches this search or filter."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Images" }).click();
  await expect(
    page.getByText("No media matches this search or filter."),
  ).toBeVisible();
  await page.getByRole("button", { name: "All media" }).click();
  await page.getByLabel("Search media library").fill("");
  await page.getByRole("button", { name: "Attach" }).first().click();
  await expect(page.getByText("RubberDuck upload")).toBeVisible();
  await page.getByLabel("Visualization data").fill("Recall only");
  await page.getByRole("button", { name: "Add chart" }).click();
  await expect(
    page.getByText('Use one "label, value" pair per line.'),
  ).toBeVisible();
  await page
    .getByLabel("Visualization data")
    .fill("Retrieval recall, 86\nCitation accuracy, 94");
  await page.getByRole("button", { name: "Add chart" }).click();
  await expect(page.getByText("Quality gates / 2 rows")).toBeVisible();
  await page.getByLabel("Visualization type").selectOption("line");
  await page.getByLabel("Visualization block").fill("Latency trend");
  await page.getByLabel("Visualization data").fill("P50, 120\nP95, 240");
  await page.getByRole("button", { name: "Add chart" }).click();
  await expect(page.getByText("Latency trend / 2 rows")).toBeVisible();
  await expect(
    page.locator("span").filter({ hasText: /^line$/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Runnable cell/i }).click();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText(/Saved \d/i)).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByRole("heading", { name: "Version history" }),
  ).toBeVisible();
  await expect(page.getByText(/v\d+ restore point/i).first()).toBeVisible();
  await page.getByRole("button", { name: "Compare" }).first().click();
  await expect(page.getByText(/Comparing v\d+/i)).toBeVisible();
  await page.getByLabel("Title").fill("Temporary restore title");
  await expect(page.getByText("Unsaved changes")).toBeVisible();
  await page
    .getByRole("button", { name: /Restore v\d+/i })
    .first()
    .click();
  await expect(page.getByLabel("Title")).toHaveValue(
    "Building Reliable Agent Tools v2",
  );
  await page.setInputFiles('input[type="file"]', {
    name: "rag-evals.ipynb",
    mimeType: "application/x-ipynb+json",
    buffer: Buffer.from(
      JSON.stringify({
        metadata: {
          kernelspec: {
            language: "python",
          },
        },
        cells: [
          {
            cell_type: "markdown",
            source: "# Load corpus\nStart with deterministic fixtures.",
          },
          {
            cell_type: "code",
            source: "documents = ['Source: docs']\nprint(len(documents))",
          },
          {
            cell_type: "markdown",
            source: "## Grounded answer\nNow validate attribution.",
          },
          {
            cell_type: "code",
            source: "answer = ''",
            metadata: {
              devit: {
                exercise: true,
                prompt: "Create an answer containing Source.",
                assertionCode: "assert 'source' in answer.lower()",
                successMessage: "Grounding check passed.",
              },
            },
          },
        ],
      }),
    ),
  });
  await expect(page.getByText("rag-evals.ipynb").first()).toBeVisible();
  await expect(
    page.getByText(/Import preview: rag-evals.ipynb/i),
  ).toBeVisible();
  await expect(page.locator("tbody").getByText("reference code")).toBeVisible();
  await expect(page.locator("tbody").getByText("exercise")).toBeVisible();
  await page.getByRole("button", { name: "Apply import" }).click();
  await expect(
    page.getByRole("button", { name: /^\d+\. Load corpus$/i }),
  ).toBeVisible();
  await expect(
    page
      .locator("textarea")
      .filter({ hasText: "documents = ['Source: docs']" })
      .first(),
  ).toBeVisible();
  await page.setInputFiles('input[type="file"]', {
    name: "broken.ipynb",
    mimeType: "application/x-ipynb+json",
    buffer: Buffer.from("not-json"),
  });
  await expect(page.getByText(/could not read that notebook/i)).toBeVisible();
  await page.goto("/courses?lang=en", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByText("Building Reliable Agent Tools v2"),
  ).not.toBeVisible();
  await page.goto("/u/alexchen?lang=en", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Private drafts" }),
  ).toBeVisible();
  await expect(
    page.getByText("Building Reliable Agent Tools v2").first(),
  ).toBeVisible();
  await page
    .locator('a[href*="/courses/new?draftId="]')
    .filter({ hasText: "Building Reliable Agent Tools v2" })
    .first()
    .click();
  await page.waitForURL(/\/courses\/new\?draftId=/);
  await expect(
    page.getByRole("heading", { name: "Course Studio" }),
  ).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveValue(
    "Building Reliable Agent Tools v2",
  );
  await expect(
    page.getByRole("heading", { name: "Version history" }),
  ).toBeVisible();
});

test("identity hub renders privacy controls", async ({ page }) => {
  await page.goto("/u/alexchen?lang=en", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Alex Chen" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Privacy" })).toBeVisible();
  await expect(page.getByText(/No public rejection counters/i)).toBeVisible();
});
