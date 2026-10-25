import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // mod/ tests run under `claude plugin test mod` (the engine's kit).
    exclude: ['tests/shell/**', 'node_modules/**', 'mod/**'],
  },
})
