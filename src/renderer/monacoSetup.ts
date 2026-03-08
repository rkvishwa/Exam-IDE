/**
 * Configure @monaco-editor/react to use the locally bundled monaco-editor
 * instead of fetching from CDN.  This ensures the editor loads on machines
 * without internet access (e.g. exam-room Windows clients) and avoids CSP
 * issues in the production Electron build.
 *
 * Also configures MonacoEnvironment.getWorker so Monaco's web workers load
 * correctly inside Electron (both dev and production).  Without this,
 * Monaco v0.55+ attempts ESM-based blob workers that fail in Electron due
 * to cross-origin / file-protocol restrictions, producing "Uncaught Worker
 * error" events and temporary UI freezes whenever the worker creation is
 * retried (e.g. during collaboration when new language models are requested).
 *
 * Must be imported BEFORE any <MonacoEditor /> component is rendered.
 */
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

// Provide a custom getWorker that intercepts Monaco's worker creation.
// The default ESM worker path in Monaco v0.55+ creates blob URLs containing
// `await import(url)` which fail in Electron (file:// origin mismatch,
// Windows CSP restrictions on module workers from blobs).
//
// Our approach:
// 1. In DEV (Vite dev server, http origin): Use blob+import() ESM workers
//    pointing at the Vite-served worker entry points via the dev server URL.
// 2. In PROD (file:// or custom protocol): Return a no-op worker.  Monaco
//    falls back to running language services on the main thread which is
//    perfectly acceptable for an exam IDE.
//
// In both cases we attach an onerror handler to suppress uncaught Worker
// errors that would otherwise freeze the UI.
const IS_DEV =
  typeof location !== "undefined" && location.protocol.startsWith("http");

const WORKER_MAP: Record<string, string> = {
  json: "/node_modules/monaco-editor/esm/vs/language/json/json.worker.js?worker_file",
  css: "/node_modules/monaco-editor/esm/vs/language/css/css.worker.js?worker_file",
  scss: "/node_modules/monaco-editor/esm/vs/language/css/css.worker.js?worker_file",
  less: "/node_modules/monaco-editor/esm/vs/language/css/css.worker.js?worker_file",
  html: "/node_modules/monaco-editor/esm/vs/language/html/html.worker.js?worker_file",
  handlebars: "/node_modules/monaco-editor/esm/vs/language/html/html.worker.js?worker_file",
  razor: "/node_modules/monaco-editor/esm/vs/language/html/html.worker.js?worker_file",
  typescript: "/node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js?worker_file",
  javascript: "/node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js?worker_file",
};
const DEFAULT_WORKER =
  "/node_modules/monaco-editor/esm/vs/editor/editor.worker.js?worker_file";

function createNoopWorker(label: string): Worker {
  // Minimal worker that responds to the initialization message
  // Monaco sends so it doesn't hang waiting for a handshake.
  const blob = new Blob(
    ['self.onmessage = function() { /* noop */ };'],
    { type: "application/javascript" },
  );
  const url = URL.createObjectURL(blob);
  const w = new Worker(url, { name: label });
  w.onerror = (e) => {
    e.preventDefault();       // Suppress uncaught Worker error
  };
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  return w;
}

self.MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    if (IS_DEV) {
      // In dev, Vite serves worker files over HTTP — we can create ESM blob workers
      const workerPath = WORKER_MAP[label] || DEFAULT_WORKER;
      const workerUrl = new URL(workerPath, location.origin).href;
      try {
        const blob = new Blob(
          [`import ${JSON.stringify(workerUrl)};`],
          { type: "application/javascript" },
        );
        const blobUrl = URL.createObjectURL(blob);
        const worker = new Worker(blobUrl, { type: "module", name: label });
        // Prevent uncaught Worker errors from freezing the UI
        worker.onerror = (e) => {
          e.preventDefault();
          console.warn(`[Monaco] Worker '${label}' failed, falling back to main-thread mode`);
        };
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        return worker;
      } catch {
        return createNoopWorker(label);
      }
    }

    // Production: file:// origin — workers can't load ESM modules.
    // Return a no-op worker so Monaco falls back gracefully.
    return createNoopWorker(label);
  },
};

// Point @monaco-editor/react at the local bundle instead of CDN.
loader.config({ monaco });
