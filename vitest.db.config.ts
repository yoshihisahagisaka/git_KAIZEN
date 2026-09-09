import { defineConfig } from 'vitest/config';
export default defineConfig({ test: {
  include: ['tests/database/**/*.test.ts'], environment: 'node',
  fileParallelism: false, hookTimeout: 60000, testTimeout: 15000,
} });
