import { baseConfig, defaultExportConfig } from '@daniel-rose/eslint-config'

// The mod (mod/) is typed against the declarations Claude Code writes beside
// a loaded mod (`claude-code`), which this repository and CI do not have: it
// is linted without type information, and type-checked by `claude plugin
// validate` / `claude plugin test` locally.
const typescriptPlugin = baseConfig.find(
  config => config.plugins?.['@typescript-eslint'] !== undefined
).plugins['@typescript-eslint']

export default [
  ...baseConfig,
  ...defaultExportConfig,
  {
    ...typescriptPlugin.configs['flat/disable-type-checked'],
    files: ['mod/**/*.ts'],
  },
  { ignores: ['coverage', 'schema.json', 'mod/.claude-plugin/types'] },
]
