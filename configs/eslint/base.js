import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import tseslint from 'typescript-eslint'
import { arrowFunctionRestrictions } from './restrictions.js'

export const sharedRules = {
  'no-console': ['error', { allow: ['warn', 'error'] }],
  '@typescript-eslint/consistent-type-imports': [
    'error',
    {
      prefer: 'type-imports',
      fixStyle: 'separate-type-imports',
    },
  ],
  'no-restricted-syntax': ['error', ...arrowFunctionRestrictions],
}

// Ambient declarations (`declare function`, overloads) are normal in .d.ts.
export const declarationFilesConfig = {
  files: ['**/*.d.ts'],
  rules: {
    'no-restricted-syntax': 'off',
  },
}

export const baseConfig = tseslint.config(
  { ignores: ['dist'] },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
      },
      sourceType: 'module',
    },
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    rules: sharedRules,
  },
  declarationFilesConfig,
  eslintConfigPrettier,
  eslintPluginPrettierRecommended
)
