import { ESLint } from 'eslint'
import { fileURLToPath, URL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { baseConfig, defaultExportConfig } from '../index.js'
import { reactConfig } from '../react.js'

const fixturesDir = fileURLToPath(new URL('./fixtures/', import.meta.url))

const FUNCTION_DECLARATION =
  'Use an arrow function (`const name = () => …`) instead of a function declaration.'
const FUNCTION_EXPRESSION =
  'Use an arrow function instead of a function expression.'
const METHOD_SHORTHAND =
  'Use an arrow function property (`name: () => …`) instead of method shorthand.'
const OVERLOAD =
  'Use a const typed with a callable interface instead of function overloads.'
const NAMED_EXPORT =
  'Use a default export. Named exports are only allowed as re-exports (barrels) and in types.ts.'
const TYPE_EXPORT = 'Export types from a types.ts file.'
const TS_EXPORT =
  'Use `export default` instead of a TypeScript-only export form.'
const ANONYMOUS_DEFAULT =
  'Name the default export: declare it first, then `export default name`.'

const createLinter = config =>
  new ESLint({
    cwd: fixturesDir,
    // Keeps configs/eslint/eslint.config.js out of the fixture runs.
    overrideConfigFile: true,
    overrideConfig: [
      ...config,
      {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: { parserOptions: { tsconfigRootDir: fixturesDir } },
      },
    ],
  })

const linters = {
  base: createLinter(baseConfig),
  react: createLinter(reactConfig),
  baseDefaultExports: createLinter([...baseConfig, ...defaultExportConfig]),
  reactDefaultExports: createLinter([...reactConfig, ...defaultExportConfig]),
}

// Plugin-owned messages are matched by rule id only; our own selectors all
// report as no-restricted-syntax, so their message tells which one fired.
const lint = async (linter, file) => {
  const results = await linters[linter].lintFiles([file])

  expect(results).toHaveLength(1)

  const [{ fatalErrorCount, messages }] = results

  expect(fatalErrorCount).toBe(0)

  return messages.map(({ line, ruleId, message }) =>
    ruleId === 'no-restricted-syntax' ? [line, ruleId, message] : [line, ruleId]
  )
}

const restricted = (line, message) => [line, 'no-restricted-syntax', message]

describe('arrow functions (baseConfig, reactConfig)', () => {
  it.each([
    [
      'base',
      'arrow/function-declaration.ts',
      [restricted(1, FUNCTION_DECLARATION)],
    ],
    [
      'base',
      'arrow/function-expression.ts',
      [restricted(1, FUNCTION_EXPRESSION)],
    ],
    [
      'base',
      'arrow/overloads.ts',
      [
        restricted(1, OVERLOAD),
        restricted(2, OVERLOAD),
        restricted(3, FUNCTION_DECLARATION),
      ],
    ],
    ['base', 'arrow/method-shorthand.ts', [restricted(3, METHOD_SHORTHAND)]],
    ['react', 'arrow/component.tsx', [restricted(1, FUNCTION_DECLARATION)]],
    ['base', 'arrow/allowed-members.ts', []],
    ['base', 'arrow/declarations.d.ts', []],
  ])('%s: %s', async (linter, file, expected) => {
    expect(await lint(linter, file)).toEqual(expected)
  })
})

describe('default exports (defaultExportConfig)', () => {
  it.each([
    [
      'baseDefaultExports',
      'exports/named-exports.ts',
      [
        restricted(1, NAMED_EXPORT),
        restricted(3, NAMED_EXPORT),
        restricted(7, NAMED_EXPORT),
        restricted(13, NAMED_EXPORT),
      ],
    ],
    [
      'baseDefaultExports',
      'exports/namespace.ts',
      [restricted(1, NAMED_EXPORT), [1, '@typescript-eslint/no-namespace']],
    ],
    [
      'baseDefaultExports',
      'exports/type-exports.ts',
      [restricted(1, TYPE_EXPORT), restricted(3, TYPE_EXPORT)],
    ],
    [
      'baseDefaultExports',
      'exports/default-interface.ts',
      [restricted(1, TYPE_EXPORT)],
    ],
    [
      'baseDefaultExports',
      'exports/export-assignment.ts',
      [restricted(3, TS_EXPORT)],
    ],
    [
      'baseDefaultExports',
      'exports/anonymous-arrow.ts',
      [restricted(1, ANONYMOUS_DEFAULT)],
    ],
    [
      'baseDefaultExports',
      'exports/anonymous-class.ts',
      [restricted(1, ANONYMOUS_DEFAULT)],
    ],
    [
      'baseDefaultExports',
      'exports/anonymous-function.ts',
      [restricted(1, ANONYMOUS_DEFAULT), restricted(1, FUNCTION_EXPRESSION)],
    ],
    [
      'reactDefaultExports',
      'exports/component.tsx',
      [restricted(1, NAMED_EXPORT)],
    ],
    ['baseDefaultExports', 'exports/default-export.ts', []],
    ['baseDefaultExports', 'exports/default-specifier.ts', []],
    ['baseDefaultExports', 'exports/default-string-specifier.ts', []],
    ['baseDefaultExports', 'exports/barrel.ts', []],
    ['baseDefaultExports', 'exports/types.ts', []],
    ['baseDefaultExports', 'exports/config-call.ts', []],
    ['baseDefaultExports', 'exports/declarations.d.ts', []],
    ['reactDefaultExports', 'exports/declarations.d.ts', []],
  ])('%s: %s', async (linter, file, expected) => {
    expect(await lint(linter, file)).toEqual(expected)
  })

  it('stays off without the opt-in', async () => {
    expect(await lint('base', 'exports/named-exports.ts')).toEqual([])
  })
})

describe('existing rules', () => {
  it.each([
    ['base', 'existing/console.ts', [[2, 'no-console']]],
    [
      'base',
      'existing/type-imports.ts',
      [[1, '@typescript-eslint/consistent-type-imports']],
    ],
    ['react', 'existing/a11y.tsx', [[1, 'jsx-a11y-x/alt-text']]],
    ['react', 'existing/hooks.tsx', [[8, 'react-hooks/rules-of-hooks']]],
    // Custom hooks usually live in their own .ts file
    ['react', 'existing/custom-hook.ts', [[8, 'react-hooks/rules-of-hooks']]],
    [
      'react',
      'existing/refresh.tsx',
      [[3, 'react-refresh/only-export-components']],
    ],
  ])('%s: %s', async (linter, file, expected) => {
    expect(await lint(linter, file)).toEqual(expected)
  })
})
