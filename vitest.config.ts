import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // index.ts and types.ts have no executable logic; mcp-server.ts is a
      // side-effectful stdio entry point (its logic lives in mcp-server-core.ts).
      exclude: ['src/index.ts', 'src/types.ts', 'src/mcp-server.ts'],
      // Lines is comfortably above 75%. Functions sits ~70% because the 20
      // mcp-tools.ts handlers are thin wrappers exercised end-to-end rather
      // than unit-tested; gate set just below actual per the hardening plan.
      // Raise these as coverage improves — do not lower to pass.
      thresholds: { lines: 75, functions: 65 },
    },
  },
});
