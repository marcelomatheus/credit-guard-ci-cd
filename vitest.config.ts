import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/modules/**/*.ts', 'src/interfaces/**/*.ts', 'src/infrastructure/**/*.ts'],
      exclude: ['src/interfaces/http/openapi.ts'],
      reporter: ['text', 'lcov'],
      thresholds: { statements: 85, branches: 75, functions: 85, lines: 85 }
    }
  }
});
