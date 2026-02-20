//@ts-nocheck
import {
  Account,
  ProgramManager,
  initThreadPool,
  AleoKeyProvider,
} from "@provablehq/sdk";
import { expose } from "comlink";

await initThreadPool();

// Persistent ProgramManager instance (reused across calls)
let programManager: ProgramManager | null = null;
let currentPrivateKey: string | null = null;

/**
 * Ensure ProgramManager is initialized with key caching.
 * Reuses existing instance if private key has not changed.
 */
function ensureProgramManager(privateKey?: string): ProgramManager {
  const keyToUse = privateKey || null;
  if (programManager && currentPrivateKey === keyToUse) {
    return programManager;
  }

  const keyProvider = new AleoKeyProvider();
  keyProvider.useCache(true);

  programManager = new ProgramManager(undefined, keyProvider, undefined);

  if (keyToUse) {
    const account = new Account({ privateKey: keyToUse });
    programManager.setAccount(account);
  } else {
    const account = new Account();
    programManager.setAccount(account);
  }

  currentPrivateKey = keyToUse;
  return programManager;
}

/**
 * Execute a program locally with optional ZK proof generation.
 */
async function executeProgram(
  program: string,
  functionName: string,
  inputs: string[],
  proveExecution: boolean = true,
  privateKey?: string,
): Promise<{ outputs: string[]; proof?: string; executionTime: number }> {
  const startTime = Date.now();
  const pm = ensureProgramManager(privateKey);

  const executionResponse = await pm.run(
    program,
    functionName,
    inputs,
    proveExecution,
  );

  const outputs = executionResponse.getOutputs();

  let proof: string | undefined;
  if (proveExecution) {
    try {
      const execution = executionResponse.getExecution();
      proof = execution ? execution.toString() : undefined;
    } catch {
      // Proof extraction may not be available for all execution types
    }
  }

  return {
    outputs,
    proof,
    executionTime: Date.now() - startTime,
  };
}

/**
 * Generate a new Aleo account.
 */
async function createAccount(): Promise<{
  privateKey: string;
  viewKey: string;
  address: string;
}> {
  const account = new Account();
  return {
    privateKey: account.privateKey().to_string(),
    viewKey: account.viewKey().to_string(),
    address: account.address().to_string(),
  };
}

/**
 * Import an account from a private key string.
 */
async function importAccount(privateKey: string): Promise<{
  privateKey: string;
  viewKey: string;
  address: string;
}> {
  const account = new Account({ privateKey });
  return {
    privateKey: account.privateKey().to_string(),
    viewKey: account.viewKey().to_string(),
    address: account.address().to_string(),
  };
}

/**
 * Health check: returns true if the worker WASM thread pool is ready.
 */
async function isReady(): Promise<boolean> {
  return true;
}

const workerAPI = {
  executeProgram,
  createAccount,
  importAccount,
  isReady,
};

export type AleoWorkerAPI = typeof workerAPI;

expose(workerAPI);
