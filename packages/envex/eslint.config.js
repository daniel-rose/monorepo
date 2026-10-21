import { defaultExportConfig } from '@daniel-rose/eslint-config'
import { reactConfig } from '@daniel-rose/eslint-config/react'

export default [
  ...reactConfig,
  ...defaultExportConfig,
  { ignores: ['coverage'] },
]
