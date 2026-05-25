# Runtime Execution Strategy

RubberDuck supports real in-page Python execution today and keeps a clear boundary for GPU workloads.

## Current In-Browser Runtime

- Engine: Pyodide running in a Web Worker.
- Hardware: browser WebAssembly CPU.
- Package loading: `pyodide.loadPackagesFromImports()` inspects submitted code and loads known Pyodide packages, such as `numpy`, before execution.
- Output model: stdout, stderr, duration, pass/fail, assertion tracebacks, and exercise telemetry are persisted through server actions.
- Verified scenario: the E2E suite runs a NumPy retrieval-style pipeline in the course reader, validates cosine-score output, validates the selected source document, and then validates the autograder assertion.

This is real Python execution inside the learner's browser. It is appropriate for lightweight tutorials, deterministic checks, data-structure exercises, algorithmic exercises, and small scientific Python pipelines.

## Browser Runtime Limits

- No CUDA/GPU access from Pyodide.
- No long-running training jobs.
- No arbitrary native system dependencies.
- Package support is limited to Pyodide-compatible packages or pure Python packages that can run in WebAssembly.

## Colab/GPU Handoff

Google Colab executes code in a virtual machine private to the user's account and offers optional GPU/TPU runtimes, but resource availability and runtime limits vary. Colab's public FAQ also states that free runtimes prioritise active notebook programming and may terminate experiences that bypass the notebook UI or primarily interact through a web UI.

For that reason, the compliant MVP path is:

1. Export a RubberDuck course as a portable `.ipynb`.
2. Preserve RubberDuck exercise metadata in the notebook.
3. Let the learner open/upload the notebook in Colab.
4. Let the learner choose a GPU runtime inside Colab when needed.

The exported notebook currently keeps the backwards-compatible `metadata.devit.execution.gpu.mode = "colab-handoff"` key while the product-facing brand transitions to RubberDuck.

## Direct GPU Execution From RubberDuck

To execute GPU workloads directly from the RubberDuck web UI, RubberDuck needs a managed execution backend rather than using free Colab as a remote-control backend.

The production architecture should be:

- API creates an execution job with authenticated user, course, exercise, resource class, timeout, and idempotency key.
- Queue dispatches job to sandboxed CPU/GPU workers.
- Worker runs in a locked-down container with memory, CPU/GPU, network, filesystem, package, and wall-clock limits.
- Runtime streams stdout/stderr/events back to RubberDuck.
- Server persists final result, artifacts, logs, and audit metadata.
- Scheduler enforces quotas, abuse controls, cost controls, and cancellation.

Possible providers later: Colab Enterprise / Vertex AI, Modal, RunPod, Kubernetes with NVIDIA device plugin, or a self-hosted Jupyter Enterprise Gateway-style worker pool.

## Near-Term Product Path

1. Keep browser Pyodide for instant lightweight execution.
2. Add explicit runtime badges in the reader/editor: Browser CPU, Colab handoff, managed GPU.
3. Add notebook export/open flows for Colab-compatible GPU notebooks.
4. Add a provider abstraction for managed execution jobs before supporting direct GPU execution.
