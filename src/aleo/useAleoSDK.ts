// React hook for Aleo SDK initialization and state management
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initializeAleoSDK,
  getSDKStatus,
  isSDKReady,
  SDKStatus,
} from './testnetClient';
import {
  generateAccount,
  importAccount,
  getOrCreateAccount,
  isValidAleoAddress,
  generateRandomField,
  getAccountBalance,
} from './aleoClient';
import { AleoAccount } from './types';

export interface UseAleoSDKResult {
  // SDK state
  isInitialized: boolean;
  isLoading: boolean;
  isUsingMock: boolean;
  isUsingWorker: boolean;
  error: string | null;
  status: SDKStatus;

  // Account operations
  account: AleoAccount | null;
  balance: number;
  createNewAccount: () => Promise<AleoAccount>;
  importExistingAccount: (privateKey: string) => Promise<AleoAccount>;
  loadStoredAccount: () => Promise<AleoAccount>;
  refreshBalance: () => Promise<void>;

  // Utility functions
  validateAddress: (address: string) => boolean;
  generateMeetingId: () => Promise<string>;

  // Manual initialization
  initialize: () => Promise<void>;
}

/**
 * React hook for managing Aleo SDK state and operations
 */
export function useAleoSDK(autoInitialize: boolean = true): UseAleoSDKResult {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SDKStatus>({
    isInitialized: false,
    isUsingMock: true,
    isUsingWorker: false,
    error: null,
  });
  const [account, setAccount] = useState<AleoAccount | null>(null);
  const [balance, setBalance] = useState<number>(0);

  const initializationAttempted = useRef(false);

  // Initialize the SDK
  const initialize = useCallback(async () => {
    if (isInitialized || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('[useAleoSDK] Initializing Aleo SDK...');
      await initializeAleoSDK();

      const currentStatus = getSDKStatus();
      setStatus(currentStatus);
      setIsInitialized(true);

      if (currentStatus.error) {
        console.warn('[useAleoSDK] SDK initialized with warning:', currentStatus.error);
      } else {
        console.log('[useAleoSDK] SDK initialized successfully');
        console.log('[useAleoSDK] Using worker:', currentStatus.isUsingWorker);
        console.log('[useAleoSDK] Using mock:', currentStatus.isUsingMock);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to initialize Aleo SDK';
      setError(errorMessage);
      console.error('[useAleoSDK] Initialization failed:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, isLoading]);

  // Auto-initialize on mount if enabled
  useEffect(() => {
    if (autoInitialize && !initializationAttempted.current) {
      initializationAttempted.current = true;
      initialize();
    }
  }, [autoInitialize, initialize]);

  // Create a new account
  const createNewAccount = useCallback(async (): Promise<AleoAccount> => {
    if (!isInitialized) {
      await initialize();
    }

    const newAccount = await generateAccount();
    setAccount(newAccount);
    return newAccount;
  }, [isInitialized, initialize]);

  // Import an existing account
  const importExistingAccount = useCallback(async (privateKey: string): Promise<AleoAccount> => {
    if (!isInitialized) {
      await initialize();
    }

    const importedAccount = await importAccount(privateKey);
    setAccount(importedAccount);
    return importedAccount;
  }, [isInitialized, initialize]);

  // Load account from storage or create new
  const loadStoredAccount = useCallback(async (): Promise<AleoAccount> => {
    if (!isInitialized) {
      await initialize();
    }

    const storedAccount = await getOrCreateAccount();
    setAccount(storedAccount);
    return storedAccount;
  }, [isInitialized, initialize]);

  // Refresh account balance
  const refreshBalance = useCallback(async () => {
    if (!account) return;

    try {
      const newBalance = await getAccountBalance(account.address);
      setBalance(newBalance);
    } catch (err) {
      console.warn('[useAleoSDK] Failed to fetch balance:', err);
    }
  }, [account]);

  // Refresh balance when account changes
  useEffect(() => {
    if (account && isInitialized) {
      refreshBalance();
    }
  }, [account, isInitialized, refreshBalance]);

  // Validate an Aleo address
  const validateAddress = useCallback((address: string): boolean => {
    return isValidAleoAddress(address);
  }, []);

  // Generate a meeting ID
  const generateMeetingId = useCallback(async (): Promise<string> => {
    if (!isInitialized) {
      await initialize();
    }
    return generateRandomField();
  }, [isInitialized, initialize]);

  return {
    // SDK state
    isInitialized,
    isLoading,
    isUsingMock: status.isUsingMock,
    isUsingWorker: status.isUsingWorker || false,
    error,
    status,

    // Account operations
    account,
    balance,
    createNewAccount,
    importExistingAccount,
    loadStoredAccount,
    refreshBalance,

    // Utility functions
    validateAddress,
    generateMeetingId,

    // Manual initialization
    initialize,
  };
}

/**
 * Hook for SDK status only (lightweight, no account management)
 */
export function useAleoSDKStatus(): {
  isReady: boolean;
  isUsingMock: boolean;
  isUsingWorker: boolean;
  status: SDKStatus;
} {
  const [status, setStatus] = useState<SDKStatus>({
    isInitialized: false,
    isUsingMock: true,
    isUsingWorker: false,
    error: null,
  });

  useEffect(() => {
    const checkStatus = () => {
      setStatus(getSDKStatus());
    };

    // Check immediately
    checkStatus();

    // Check periodically until initialized
    const interval = setInterval(() => {
      checkStatus();
      if (isSDKReady()) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return {
    isReady: status.isInitialized,
    isUsingMock: status.isUsingMock,
    isUsingWorker: status.isUsingWorker || false,
    status,
  };
}

export default useAleoSDK;
