import { defineConfig } from 'vitest/config';
export default defineConfig({ test: {
  include: ['tests/database/**/*.test.ts','tests/golden/**/*.test.ts'], environment: 'node',
  // Reuse one test worker for the embedded PostgreSQL lifecycle. The default
  // fork pool can surface a late 57P01 when a retired fixture shuts down.
  pool: 'threads', maxWorkers: 1, fileParallelism: false,
  hookTimeout: 60000, testTimeout: 15000,
} });
