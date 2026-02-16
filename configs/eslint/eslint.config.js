import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

export default [
  { ignores: ['dist'] },
  js.configs.recommended,
  eslintConfigPrettier,
  eslintPluginPrettierRecommended,
]
