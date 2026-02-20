// Aleo Testnet Client - Real SDK integration via Web Worker
// The Aleo SDK's WASM requires initThreadPool() which needs Web Workers.
// All proof generation runs inside aleoWorker.ts via comlink.

import { aleoConfig, getNetworkUrl, isUsingMockSDK } from './aleoConfig';
import { AleoAccount } from './types';
import { getAleoWorker, isWorkerReady, getWorkerError } from './aleoWorkerClient';

// SDK state
let sdkInitialized = false;
let initializationPromise: Promise<void> | null = null;

// SDK initialization status
export interface SDKStatus {
  isInitialized: boolean;
  isUsingMock: boolean;
  isUsingWorker: boolean;
  error: string | null;
}

let sdkStatus: SDKStatus = {
  isInitialized: false,
  isUsingMock: true,
  isUsingWorker: false,
  error: null,
};

/**
 * Initialize the Aleo SDK via Web Worker
 * This must be called before any other SDK functions
 */
export async function initializeAleoSDK(): Promise<void> {
  if (sdkInitialized) return;
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      // Check if we should use mock SDK
      if (isUsingMockSDK()) {
        console.log('[SDK] Mock mode forced via config');
        sdkStatus = { isInitialized: true, isUsingMock: true, isUsingWorker: false, error: null };
        sdkInitialized = true;
        return;
      }

      // PRIMARY: Try worker-based real SDK
      try {
        await getAleoWorker();
        sdkStatus = { isInitialized: true, isUsingMock: false, isUsingWorker: true, error: null };
        sdkInitialized = true;
        console.log('[SDK] Initialized via Web Worker (real ZK proofs enabled)');
        return;
      } catch (workerError: any) {
        console.warn('[SDK] Worker init failed:', workerError.message);
      }

      // FALLBACK: mock SDK
      sdkStatus = {
        isInitialized: true,
        isUsingMock: true,
        isUsingWorker: false,
        error: `Worker failed: ${getWorkerError() || 'unknown error'}`,
      };
      sdkInitialized = true;
      console.log('[SDK] Falling back to mock mode');
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}

/**
 * Get current SDK status
 */
export function getSDKStatus(): SDKStatus {
  return { ...sdkStatus };
}

/**
 * Check if SDK is initialized
 */
export function isSDKReady(): boolean {
  return sdkInitialized;
}

/**
 * Create a new Aleo account
 */
export async function createAccount(): Promise<AleoAccount> {
  await initializeAleoSDK();

  // Use worker for real account generation
  if (isWorkerReady()) {
    try {
      const worker = await getAleoWorker();
      return await worker.createAccount();
    } catch (err: any) {
      console.warn('[SDK] Worker createAccount failed:', err.message);
    }
  }

  // Mock fallback
  const { MockAccount } = await import('./mockAleoSDK');
  const account = new MockAccount();
  return {
    privateKey: account.privateKey().to_string(),
    viewKey: account.viewKey().to_string(),
    address: account.address().to_string(),
  };
}

/**
 * Import an account from private key
 */
export async function importAccountFromKey(privateKey: string): Promise<AleoAccount> {
  await initializeAleoSDK();

  if (isWorkerReady()) {
    try {
      const worker = await getAleoWorker();
      return await worker.importAccount(privateKey);
    } catch (err: any) {
      console.warn('[SDK] Worker importAccount failed:', err.message);
    }
  }

  // Mock fallback
  const { MockAccount } = await import('./mockAleoSDK');
  const account = new MockAccount({ privateKey });
  return {
    privateKey: account.privateKey().to_string(),
    viewKey: account.viewKey().to_string(),
    address: account.address().to_string(),
  };
}

/**
 * Create a ProgramManager for executing transitions
 * For on-chain operations that need network client
 */
export async function createProgramManager(account: AleoAccount): Promise<any> {
  await initializeAleoSDK();

  // For on-chain operations, we still need a ProgramManager with network client.
  // However, most operations in AleoCal use executeOffline() which goes through the worker.
  // This function is kept for compatibility with on-chain transitions.

  if (isWorkerReady()) {
    // Return a proxy that delegates to the worker
    return {
      run: async (programId: string, functionName: string, inputs: string[], prove: boolean = true, ...rest: any[]) => {
        const worker = await getAleoWorker();
        const result = await worker.executeProgram(programId, functionName, inputs, prove, account.privateKey);
        return { outputs: result.outputs, proof: result.proof };
      },
      execute: async (programId: string, functionName: string, inputs: string[], fee: number, ...rest: any[]) => {
        // On-chain execution not yet supported via worker
        throw new Error('On-chain execution requires network deployment. Use executeOffline() for local proofs.');
      },
      setAccount: () => { /* no-op, account is passed per-call */ },
    };
  }

  // Mock fallback
  const { MockProgramManager } = await import('./mockAleoSDK');
  const pm = new MockProgramManager();
  const { MockAccount } = await import('./mockAleoSDK');
  pm.setAccount(new MockAccount({ privateKey: account.privateKey }));
  return pm;
}

/**
 * Create a network client for querying the Aleo network
 */
export async function createNetworkClient(): Promise<any> {
  // Network client doesn't need WASM - it's just HTTP calls
  try {
    const sdk = await import('@provablehq/sdk');
    if (sdk.AleoNetworkClient) {
      return new sdk.AleoNetworkClient(getNetworkUrl());
    }
  } catch {
    // SDK import may fail in some environments
  }

  // Mock network client fallback
  return {
    getProgram: async (_programId: string) => null,
    getTransaction: async (_txId: string) => null,
    getProgramMappingValue: async (_programId: string, _mappingName: string, _key: string) => null,
  };
}

/**
 * Execute a program transition locally (offline)
 * This runs the computation and generates a ZK proof without submitting to the network.
 * Uses the Web Worker for real Aleo SDK execution.
 */
export async function executeOffline(
  account: AleoAccount,
  programCode: string,
  functionName: string,
  inputs: string[],
  proveExecution: boolean = false
): Promise<{ outputs: string[]; proof?: string }> {
  await initializeAleoSDK();

  // PRIMARY: Use Web Worker for real ZK proof generation
  if (isWorkerReady()) {
    try {
      const worker = await getAleoWorker();
      const result = await worker.executeProgram(
        programCode,
        functionName,
        inputs,
        proveExecution,             // Use flag
        account.privateKey,
      );
      console.log(`[SDK] Real ZK proof generated in ${result.executionTime}ms`);
      return {
        outputs: result.outputs,
        proof: result.proof,
      };
    } catch (workerErr: any) {
      console.warn('[SDK] Worker execution failed, falling back to mock:', workerErr.message);
    }
  }

  // FALLBACK: Mock SDK
  const { MockProgramManager } = await import('./mockAleoSDK');
  const mockPm = new MockProgramManager();
  mockPm.setAccount({
    address: () => ({ to_string: () => account.address }),
  } as any);
  const mockResult = await mockPm.run(programCode, functionName, inputs, true);
  return { outputs: mockResult.outputs, proof: undefined };
}

/**
 * Execute a program transition and broadcast to the network
 */
export async function executeOnChain(
  account: AleoAccount,
  programId: string,
  functionName: string,
  inputs: string[],
  fee: number = aleoConfig.fees.baseFee
): Promise<string> {
  const programManager = await createProgramManager(account);

  try {
    const txId = await programManager.execute(
      programId,
      functionName,
      inputs,
      fee
    );
    return txId;
  } catch (error: any) {
    throw new Error(`On-chain execution failed: ${error.message}`);
  }
}

/**
 * Wait for a transaction to be confirmed
 */
export async function waitForTransaction(
  txId: string,
  timeout: number = aleoConfig.timeouts.confirmation
): Promise<any> {
  const networkClient = await createNetworkClient();
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const transaction = await networkClient.getTransaction(txId);
      if (transaction) {
        return transaction;
      }
    } catch {
      // Transaction not found yet, continue waiting
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  throw new Error(`Transaction ${txId} not confirmed within ${timeout}ms`);
}

/**
 * Get a mapping value from a deployed program
 */
export async function getMappingValue(
  programId: string,
  mappingName: string,
  key: string
): Promise<string | null> {
  const networkClient = await createNetworkClient();

  try {
    const value = await networkClient.getProgramMappingValue(
      programId,
      mappingName,
      key
    );
    return value;
  } catch {
    return null;
  }
}

/**
 * Check if a program is deployed on the network
 */
export async function isProgramDeployed(programId: string): Promise<boolean> {
  const networkClient = await createNetworkClient();

  try {
    const program = await networkClient.getProgram(programId);
    return program !== null;
  } catch {
    return false;
  }
}

/**
 * Deploy a program to the network
 */
export async function deployProgram(
  account: AleoAccount,
  programCode: string,
  fee: number = aleoConfig.fees.deploymentFee
): Promise<string> {
  const programManager = await createProgramManager(account);

  try {
    const txId = await programManager.deploy(programCode, fee);
    return txId;
  } catch (error: any) {
    throw new Error(`Program deployment failed: ${error.message}`);
  }
}

/**
 * Get account balance (credits)
 */
export async function getAccountBalance(address: string): Promise<number> {
  try {
    const response = await fetch(
      `${getNetworkUrl()}/testnet/account/${address}/balance`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch balance');
    }
    const data = await response.json();
    return data.balance || 0;
  } catch {
    return 0;
  }
}

/**
 * Request testnet credits from faucet
 */
export async function requestFaucetCredits(_address: string): Promise<boolean> {
  return false;
}

export default {
  initializeAleoSDK,
  getSDKStatus,
  isSDKReady,
  createAccount,
  importAccountFromKey,
  createProgramManager,
  createNetworkClient,
  executeOffline,
  executeOnChain,
  waitForTransaction,
  getMappingValue,
  isProgramDeployed,
  deployProgram,
  getAccountBalance,
  requestFaucetCredits,
};
