import { baseConfig, defaultExportConfig } from '@daniel-rose/eslint-config'

export default [
  ...baseConfig,
  ...defaultExportConfig,
  { ignores: ['coverage', 'schema.json'] },
]
