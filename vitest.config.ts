import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['tests/**/*.unit.ts'] } },
      { test: { name: 'economy', include: ['tests/**/*.simulation.ts'], testTimeout: 30_000 } },
    ],
  },
})
