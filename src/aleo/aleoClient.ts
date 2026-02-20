// Aleo client initialization and account management
// This module provides the main interface for Aleo SDK operations
import { aleoConfig } from './aleoConfig';
import { AleoAccount } from './types';
import {
  initializeAleoSDK,
  getSDKStatus,
  isSDKReady,
  createAccount as testnetCreateAccount,
  importAccountFromKey,
  createProgramManager as testnetCreateProgramManager,
  createNetworkClient as testnetCreateNetworkClient,
  executeOffline,
  executeOnChain,
  waitForTransaction,
  getMappingValue,
  isProgramDeployed,
  deployProgram,
  getAccountBalance,
  requestFaucetCredits,
  SDKStatus,
} from './testnetClient';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Re-export testnet client functions for convenience
export {
  initializeAleoSDK,
  getSDKStatus,
  isSDKReady,
  executeOffline,
  executeOnChain,
  waitForTransaction,
  getMappingValue,
  isProgramDeployed,
  deployProgram,
  getAccountBalance,
  requestFaucetCredits,
};
export type { SDKStatus };

/**
 * Initialize the Aleo SDK
 * Must be called before using any Aleo functions
 */
export async function initAleoSDK(): Promise<void> {
  return initializeAleoSDK();
}

/**
 * Generate a new Aleo account
 */
export async function generateAccount(): Promise<AleoAccount> {
  return testnetCreateAccount();
}

/**
 * Import an existing account from private key
 */
export async function importAccount(privateKey: string): Promise<AleoAccount> {
  return importAccountFromKey(privateKey);
}

/**
 * Get account from local storage or generate new one
 */
export async function getOrCreateAccount(): Promise<AleoAccount> {
  const STORAGE_KEY = 'aleocal_aleo_account';

  // Check local storage for existing account
  if (isBrowser) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Validate the stored account
        const account = await importAccount(parsed.privateKey);
        return account;
      } catch (error) {
        console.warn('Invalid stored account, generating new one');
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  // Generate new account
  const account = await generateAccount();

  // Store in local storage
  if (isBrowser) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
  }

  return account;
}

/**
 * Create an Aleo Program Manager for executing transitions
 */
export async function createProgramManager(account: AleoAccount): Promise<any> {
  return testnetCreateProgramManager(account);
}

/**
 * Create a network client for querying the Aleo network
 */
export async function createNetworkClient(): Promise<any> {
  return testnetCreateNetworkClient();
}

/**
 * Get the user's address from their private key
 */
export async function getAddressFromPrivateKey(privateKey: string): Promise<string> {
  const account = await importAccountFromKey(privateKey);
  return account.address;
}

/**
 * Check if an address is valid Aleo address
 */
export function isValidAleoAddress(address: string): boolean {
  // Aleo addresses start with "aleo1" and are 63 characters
  return /^aleo1[a-z0-9]{58}$/.test(address);
}

/**
 * Generate a random field element for use as meeting_id or salt
 */
export async function generateRandomField(): Promise<string> {
  // Generate random bytes and convert to field
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);

  // Convert to a hex string and create a field value
  const hex = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Return as field literal (truncate to fit in field)
  // Aleo field modulus: 8444461749428370424248824938781546531375899335154063827935233455917409239041
  const fieldModulus = BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239041');
  return `${BigInt('0x' + hex.slice(0, 60)) % fieldModulus}field`;
}

/**
 * Get the program ID from config
 */
export function getProgramId(): string {
  return aleoConfig.program.programId;
}

/**
 * Get base fee from config
 */
export function getBaseFee(): number {
  return aleoConfig.fees.baseFee;
}

export default {
  initAleoSDK,
  initializeAleoSDK,
  generateAccount,
  importAccount,
  getOrCreateAccount,
  createProgramManager,
  createNetworkClient,
  isValidAleoAddress,
  generateRandomField,
  getProgramId,
  getBaseFee,
  getSDKStatus,
  isSDKReady,
  executeOffline,
  executeOnChain,
  waitForTransaction,
  getMappingValue,
  isProgramDeployed,
  deployProgram,
  getAccountBalance,
  requestFaucetCredits,
};
