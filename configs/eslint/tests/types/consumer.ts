// Type-checks the published declarations the way a consumer imports them.
import {
  arrowFunctionRestrictions,
  baseConfig,
  defaultExportConfig,
  sharedRules,
} from '@daniel-rose/eslint-config'
import { reactConfig } from '@daniel-rose/eslint-config/react'
import { tailwindConfig } from '@daniel-rose/eslint-config/tailwind'
import { vitestConfig } from '@daniel-rose/eslint-config/vitest'
import { defineConfig } from 'eslint/config'

export const config = defineConfig(
  baseConfig,
  reactConfig,
  vitestConfig,
  tailwindConfig({ cssConfigPath: './src/main.css' }),
  defaultExportConfig,
  {
    rules: {
      'no-restricted-syntax': ['error', ...arrowFunctionRestrictions],
    },
  },
  {
    files: ['**/*.js'],
    rules: sharedRules,
  }
)

// @ts-expect-error cssConfigPath is required
tailwindConfig({})

// @ts-expect-error cssConfigPath is a string
tailwindConfig({ cssConfigPath: 1 })
