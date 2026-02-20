// Aleo network configuration for AleoCal
// Supports both Vite (import.meta.env) and CRA (process.env)

// Helper to get environment variable (supports both Vite and CRA)
function getEnv(viteKey: string, craKey: string, defaultValue: string): string {
  // Try Vite first (import.meta.env)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const viteValue = (import.meta.env as Record<string, string>)[viteKey];
    if (viteValue !== undefined) return viteValue;
  }
  // Fall back to CRA (process.env)
  if (typeof process !== 'undefined' && process.env) {
    const craValue = (process.env as Record<string, string | undefined>)[craKey];
    if (craValue !== undefined) return craValue;
  }
  return defaultValue;
}

// Network endpoints for different environments
export const TESTNET_API_URL = 'https://api.explorer.provable.com/v2';
export const MAINNET_API_URL = 'https://api.explorer.provable.com/v2'; // Update when mainnet is live

export const aleoConfig = {
  // Network endpoints
  network: {
    // Testnet API endpoint (Provable Explorer API)
    apiUrl: getEnv('VITE_ALEO_API_URL', 'REACT_APP_ALEO_API_URL', TESTNET_API_URL),
    // Network name (testnet or mainnet)
    networkName: getEnv('VITE_ALEO_NETWORK', 'REACT_APP_ALEO_NETWORK', 'testnet'),
    // Alternative endpoints for redundancy
    fallbackUrls: [
      'https://api.explorer.provable.com/v2',
      'https://testnetbeta.aleorpc.com',
    ],
  },

  // Program configuration
  program: {
    // Program ID on the network (deployed program)
    programId: getEnv('VITE_ALEO_PROGRAM_ID', 'REACT_APP_ALEO_PROGRAM_ID', 'privycalendar.aleo'),
    // Program source path (for local development)
    sourcePath: '/aleo/privycal/src/main.leo',
  },

  // Fee configuration (in microcredits - 1 Aleo credit = 1,000,000 microcredits)
  fees: {
    // Base fee for transitions (0.5 credits)
    baseFee: parseInt(getEnv('VITE_ALEO_BASE_FEE', 'REACT_APP_ALEO_BASE_FEE', '500000')),
    // Priority fee multiplier
    priorityMultiplier: parseFloat(getEnv('VITE_ALEO_PRIORITY_MULTIPLIER', 'REACT_APP_ALEO_PRIORITY_MULTIPLIER', '1.0')),
    // Deployment fee (higher due to program storage)
    deploymentFee: parseInt(getEnv('VITE_ALEO_DEPLOYMENT_FEE', 'REACT_APP_ALEO_DEPLOYMENT_FEE', '5000000')),
  },

  // Timeout configuration (in milliseconds)
  timeouts: {
    // Execution timeout for local proving
    execution: parseInt(getEnv('VITE_ALEO_EXECUTION_TIMEOUT', 'REACT_APP_ALEO_EXECUTION_TIMEOUT', '120000')),
    // Transaction confirmation timeout
    confirmation: parseInt(getEnv('VITE_ALEO_CONFIRMATION_TIMEOUT', 'REACT_APP_ALEO_CONFIRMATION_TIMEOUT', '300000')),
    // WASM initialization timeout
    wasmInit: parseInt(getEnv('VITE_ALEO_WASM_TIMEOUT', 'REACT_APP_ALEO_WASM_TIMEOUT', '30000')),
  },

  // SDK mode configuration
  sdk: {
    // Use mock SDK instead of real SDK (for development without WASM)
    useMock: getEnv('VITE_USE_MOCK_SDK', 'REACT_APP_USE_MOCK_SDK', 'false') === 'true',
    // Enable caching for proving keys
    useKeyCache: true,
    // Thread pool size for parallel proving (0 = auto)
    threadPoolSize: parseInt(getEnv('VITE_THREAD_POOL_SIZE', 'REACT_APP_THREAD_POOL_SIZE', '0')),
  },
};

// Validate configuration
export function validateConfig(): boolean {
  const errors: string[] = [];

  if (!aleoConfig.network.apiUrl) {
    errors.push('Missing ALEO_API_URL');
  }

  if (!aleoConfig.program.programId) {
    errors.push('Missing ALEO_PROGRAM_ID');
  }

  if (aleoConfig.fees.baseFee < 0) {
    errors.push('Invalid ALEO_BASE_FEE');
  }

  if (errors.length > 0) {
    console.error('Aleo Config Validation Errors:', errors);
    return false;
  }

  return true;
}

// Get the appropriate network URL based on environment
export function getNetworkUrl(): string {
  return aleoConfig.network.apiUrl;
}

// Check if we're in mock mode
export function isUsingMockSDK(): boolean {
  return aleoConfig.sdk.useMock;
}

export default aleoConfig;
