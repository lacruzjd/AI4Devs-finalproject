/// <reference types="vitest" />
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const appVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')).version;

export default defineConfig({
  plugins: [react()],
  // TK-159-FE / US-044: la versión del paquete llega al cliente para atar la invalidación
  // del caché del service worker al despliegue (ver public/sw.js).
  define: { __APP_VERSION__: JSON.stringify(appVersion) },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e/**'],
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
  },
});
