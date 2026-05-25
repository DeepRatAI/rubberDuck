const pyodideVersion = "0.29.4";
const localPyodideBaseUrl = "/pyodide/";
const remotePyodidePackageBaseUrl = `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`;

self.importScripts(`${localPyodideBaseUrl}pyodide.js`);

let pyodideReadyPromise;
let pyodideInstance;

async function getPyodide() {
  if (!pyodideReadyPromise) {
    pyodideReadyPromise = self.loadPyodide({
      indexURL: localPyodideBaseUrl,
      packageBaseUrl: remotePyodidePackageBaseUrl,
    });
  }
  pyodideInstance = await pyodideReadyPromise;
  return pyodideInstance;
}

function readCapturedStream(name) {
  try {
    return pyodideInstance?.runPython(`${name}.getvalue()`) ?? "";
  } catch {
    return "";
  }
}

function formatExecutionError(error) {
  const detail =
    error?.stack ||
    error?.message ||
    (typeof error === "string" ? error : String(error));

  return `Python execution failed.\n${detail || "Unknown Python error."}`;
}

self.onmessage = async (event) => {
  const startedAt = performance.now();
  const { id, code, assertionCode, preload } = event.data;

  try {
    const pyodide = await getPyodide();
    if (preload) {
      self.postMessage({
        id,
        status: "ready",
        stdout: "",
        stderr: "",
        durationMs: Math.round(performance.now() - startedAt),
      });
      return;
    }

    await pyodide.runPythonAsync(`
import sys
import traceback
from io import StringIO
_devit_stdout = StringIO()
_devit_stderr = StringIO()
_devit_failed = False
sys.stdout = _devit_stdout
sys.stderr = _devit_stderr
`);
    await pyodide.loadPackagesFromImports(`${code}\n${assertionCode || ""}`);
    pyodide.globals.set("_devit_code", code);
    pyodide.globals.set("_devit_assertion_code", assertionCode || "");
    await pyodide.runPythonAsync(`
try:
    exec(_devit_code, globals())
    if _devit_assertion_code:
        exec(_devit_assertion_code, globals())
except Exception:
    _devit_failed = True
    _devit_stderr.write(traceback.format_exc())
`);
    const stdout = pyodide.runPython("_devit_stdout.getvalue()");
    const stderr = pyodide.runPython("_devit_stderr.getvalue()");
    const failed = pyodide.runPython("_devit_failed");

    self.postMessage({
      id,
      status: failed ? "failed" : "passed",
      stdout,
      stderr: failed
        ? `Python execution failed.\n${stderr || "Unknown Python error."}`
        : stderr,
      durationMs: Math.round(performance.now() - startedAt),
    });
  } catch (error) {
    self.postMessage({
      id,
      status: "failed",
      stdout: readCapturedStream("_devit_stdout"),
      stderr: formatExecutionError(error),
      durationMs: Math.round(performance.now() - startedAt),
    });
  }
};
