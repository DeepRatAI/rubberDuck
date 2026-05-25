# Course Studio Concept Coverage

This document tracks how the current RubberDuck Course Studio maps to the original product concept.

## Implemented

- Rich course creator route at `/courses/new`.
- Tiptap-backed writing surface with headings, lists, links, and code blocks.
- Structured course sections with title, body, reference code, embeds, order controls, draft save, publish, and autosave.
- Runnable Python checkpoints using a Pyodide Web Worker.
- Browser runtime auto-loads Pyodide-compatible scientific packages from imports, verified with a NumPy retrieval pipeline.
- Exercise telemetry persistence for pass/fail, stdout, stderr, and duration.
- Course completion model requiring all sections viewed and all required exercises passed.
- Course reader with documentation-style side table of contents.
- Save, Thanks, and Export actions.
- Jupyter `.ipynb` import preview with per-cell mapping into editable sections, reference code, and `metadata.devit.exercise` runnable checkpoints before the author applies the import.
- Jupyter `.ipynb` export endpoint at `/api/courses/[slug]/export`.
- Exported notebooks include machine-readable RubberDuck execution metadata for browser CPU and Colab/GPU handoff.
- Colab-ready notebook metadata and reader link support.
- Local media library for uploaded raster images and browser-playable videos, with Postgres metadata, editable alt text/captions/labels, filename/metadata search, type and label filters, reader rendering, and local development file storage.
- Course media storage adapter boundary with implemented local and Cloudflare R2 drivers, rollback on metadata persistence failure, and fail-fast placeholders for S3 and Supabase drivers.
- Rich embed classification for images, YouTube videos, notebook links, and regular links.
- Course Studio resource manager with add/remove controls, duplicate prevention, and unsafe URL rejection.
- Safe bar, line, and table visualization blocks with row validation, persisted section JSON, reader rendering, and notebook export.
- Immutable course restore points persisted on every draft save/publish through `course_revisions`.
- Restore-from-version UI that rehydrates a selected snapshot into Course Studio as editable unsaved state.
- Revision comparison UI showing changed title, section count, runnable checks, embeds, and chart counts before restore.
- Creator analytics in Course Studio from real course state: published courses, active learners, completions, Thanks, saves, section views, and checkpoint passes.
- Interactive creator walkthrough and contextual tooltip tips covering structure, notebooks, media, runnable checks, and publish readiness.
- Owner-only private draft inventory in Identity Hub, with draft access excluded from public course discovery.
- Private draft links open Course Studio with the latest saved snapshot and its historical restore points preloaded.
- Immediate exercise failure diagnostics with Python traceback text.
- Multiple executable exercises rendered next to their owning section.
- Bilingual shell integration through existing locale plumbing.
- Tests covering studio payloads, notebook import, restore-state conversion, notebook export, rich embed classification, multi-exercise reader rendering, and E2E reader/studio flows.

## Partially Implemented

- Dynamic video/image/URL embedding exists in reader mode through typed cards, uploaded media, editor attachment controls, library search/filtering, label organization, accessibility metadata, and R2 object-storage delivery.
- Notebook import parses headings, code cells, and backwards-compatible exercise metadata. Full arbitrary notebook-to-course conversion remains intentionally conservative.
- Autosave persists drafts and creates restorable points with a compact diff viewer. It does not yet include multi-session conflict resolution or collaborative editing.
- Export currently targets Jupyter `.ipynb`. GitHub repo export and Drive export are still future integrations.
- GPU execution is a documented Colab handoff today. Direct GPU execution from the RubberDuck UI requires a managed execution backend rather than using free Colab as a remote-control backend.

## Remaining Gaps

- Containerized CPU/GPU execution backend for heavier or higher-risk workloads.
- Hosted Colab/open-runtime handoff beyond generic Colab URL metadata.
- Per-exercise failure-rate analytics and Thanks conversion over time.
- Accessibility audit dedicated specifically to Course Studio keyboard workflows.

## Current Priority

The next high-leverage Course Studio work should be:

1. Expand E2E coverage for notebook import preview, multi-exercise completion, and visual embed rendering.
2. Add richer chart editing controls such as axis labels, table row editing, and chart duplication.
3. Add conflict detection for simultaneous draft editing sessions.
