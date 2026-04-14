import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/hooks/**'],
      exclude: [
        'src/**/*.test.*',
        'src/**/*.spec.*',
        'src/test/**',
        // Soroban smart-contract interaction — requires live RPC; covered by E2E tests
        'src/lib/contract.ts',
        'src/lib/events.ts',
        // Hooks that delegate entirely to Soroban contract calls
        'src/hooks/useGroupQuery.ts',
        'src/hooks/useExpenseMutations.ts',
      ],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
      reporter: ['text', 'lcov'],
    },
  },
});
