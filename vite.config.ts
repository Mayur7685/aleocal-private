import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
  ],
  optimizeDeps: {
    // Exclude only WASM package from pre-bundling (it uses top-level await with WASM)
    exclude: ['@provablehq/wasm'],
    // Include SDK and its CommonJS dependencies for pre-bundling (converts require to import)
    include: [
      '@provablehq/sdk',
      'core-js/proposals/json-parse-with-source.js',
      'core-js/modules/esnext.json.is-raw-json',
      'core-js/modules/esnext.json.parse',
      'core-js/modules/esnext.json.raw-json',
    ],
    // Force esbuild to handle these as CommonJS
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    target: 'esnext',
    // Ensure proper chunk handling for WASM
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  worker: {
    format: 'es',
    plugins: () => [wasm(), topLevelAwait()],
  },
  server: {
    port: 3006,
    // Enable CORS for WASM loading
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  define: {
    // Handle process.env for CRA compatibility during migration
    'process.env': {},
  },
  // Properly resolve WASM assets
  assetsInclude: ['**/*.wasm'],
});
