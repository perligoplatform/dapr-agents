import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/types': resolve(__dirname, './src/types'),
      '@/agents': resolve(__dirname, './src/agents'),
      '@/workflow': resolve(__dirname, './src/workflow'),
      '@/llm': resolve(__dirname, './src/llm'),
      '@/storage': resolve(__dirname, './src/storage'),
      '@/memory': resolve(__dirname, './src/memory'),
      '@/tool': resolve(__dirname, './src/tool'),
      '@/executors': resolve(__dirname, './src/executors'),
      '@/utils': resolve(__dirname, './src/utils'),
    },
  },
});