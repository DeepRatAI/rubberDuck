import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const pyodidePackageJson = require.resolve("pyodide/package.json");
const pyodideRoot = path.dirname(pyodidePackageJson);
const publicRoot = path.resolve("public/pyodide");

const files = [
  "pyodide.js",
  "pyodide.asm.js",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
];

await mkdir(publicRoot, { recursive: true });

await Promise.all(
  files.map((file) =>
    copyFile(path.join(pyodideRoot, file), path.join(publicRoot, file)),
  ),
);

console.log(`Synced ${files.length} Pyodide runtime assets to public/pyodide.`);
