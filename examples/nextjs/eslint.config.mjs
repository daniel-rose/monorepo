import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactPackage from 'react/package.json' with { type: 'json' }

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // eslint-plugin-react resolves 'detect' (set by eslint-config-next) through
  // context.getFilename(), which ESLint 10 removed. Pass the installed version instead.
  { settings: { react: { version: reactPackage.version } } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'tests/_report/**',
  ]),
])

export default eslintConfig
