import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Fixtures are lint input; *.test.ts fixtures must not run as tests
    exclude: [...configDefaults.exclude, 'tests/fixtures/**'],
  },
})
