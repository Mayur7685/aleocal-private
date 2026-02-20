import { wrap, Remote } from "comlink";
import type { AleoWorkerAPI } from "./aleoWorker";

let workerInstance: Worker | null = null;
let workerAPI: Remote<AleoWorkerAPI> | null = null;
let initPromise: Promise<Remote<AleoWorkerAPI>> | null = null;
let workerReady = false;
let workerError: string | null = null;

/**
 * Initialize the Aleo Web Worker and return the comlink-wrapped API.
 * Caches the worker instance so subsequent calls return the same proxy.
 */
export async function getAleoWorker(): Promise<Remote<AleoWorkerAPI>> {
  if (workerAPI && workerReady) {
    return workerAPI;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      workerInstance = new Worker(
        new URL("./aleoWorker.ts", import.meta.url),
        {
          type: "module",
          name: "aleo-zk-worker",
        }
      );

      workerAPI = wrap<AleoWorkerAPI>(workerInstance);

      // Verify the worker is functional with a timeout.
      // Without a timeout, if initThreadPool() hangs (e.g. missing COOP/COEP
      // headers), isReady() never resolves and the app loads indefinitely.
      const WORKER_TIMEOUT_MS = 12000;
      const ready = await Promise.race([
        workerAPI.isReady(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Worker init timed out after 12s")), WORKER_TIMEOUT_MS)
        ),
      ]);
      if (!ready) {
        throw new Error("Worker reported not ready");
      }

      workerReady = true;
      workerError = null;
      console.log("[AleoWorker] Web Worker initialized successfully");
      return workerAPI;
    } catch (error: any) {
      workerError = error.message || "Worker initialization failed";
      workerReady = false;
      console.error("[AleoWorker] Failed to initialize:", workerError);
      throw error;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Check if the Aleo worker is ready for use.
 */
export function isWorkerReady(): boolean {
  return workerReady;
}

/**
 * Get the last worker initialization error, if any.
 */
export function getWorkerError(): string | null {
  return workerError;
}

/**
 * Terminate the worker (for cleanup).
 */
export function terminateWorker(): void {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
    workerAPI = null;
    workerReady = false;
    initPromise = null;
  }
}
