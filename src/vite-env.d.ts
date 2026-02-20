/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_MOCK_SDK: string;
  readonly VITE_ALEO_API_URL: string;
  readonly VITE_ALEO_NETWORK: string;
  readonly VITE_ALEO_PROGRAM_ID: string;
  readonly VITE_ALEO_BASE_FEE: string;
  readonly VITE_ALEO_PRIORITY_MULTIPLIER: string;
  readonly VITE_ALEO_DEPLOYMENT_FEE: string;
  readonly VITE_ALEO_EXECUTION_TIMEOUT: string;
  readonly VITE_ALEO_CONFIRMATION_TIMEOUT: string;
  readonly VITE_ALEO_WASM_TIMEOUT: string;
  readonly VITE_THREAD_POOL_SIZE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
