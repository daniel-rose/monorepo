import vitest from '@vitest/eslint-plugin'

// Append after baseConfig or reactConfig; applies to Vitest test files only.
export const vitestConfig = [
  {
    files: ['**/*.{test,spec}.{ts,tsx}'],
    plugins: {
      vitest,
    },
    rules: vitest.configs.recommended.rules,
  },
]
