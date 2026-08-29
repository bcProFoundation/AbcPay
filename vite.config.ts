import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [react(), nodePolyfills()],
  define: {
    global: 'globalThis'
  },
  server: {
    port: 8100,
    host: true
  },
  preview: {
    port: 8100
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
});
