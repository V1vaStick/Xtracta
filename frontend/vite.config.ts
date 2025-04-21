import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Optimize the build for WebAssembly modules
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      // Avoid mangling names that could affect WebAssembly imports
      mangle: {
        keep_fnames: true,
        keep_classnames: true,
      },
    },
    rollupOptions: {
      // Properly handle WebAssembly files in the build
      output: {
        manualChunks: {
          // Split WebAssembly modules into their own chunks
          'wasm-fmt': [
            '@wasm-fmt/web_fmt',
          ],
        },
      },
    },
  },
  optimizeDeps: {
    // Exclude WebAssembly modules from dependency optimization
    exclude: ['@wasm-fmt/web_fmt'],
  },
  // Properly resolve WebAssembly MIME types
  assetsInclude: ['**/*.wasm'],
});
