// `no-restricted-syntax` takes a single list: a later config block that sets
// selectors replaces the earlier list instead of extending it. Every block
// therefore spreads all lists that apply to its files.

const NAMED_EXPORT_MESSAGE =
  'Use a default export. Named exports are only allowed as re-exports (barrels) and in types.ts.'
const TYPE_EXPORT_MESSAGE = 'Export types from a types.ts file.'
const TS_EXPORT_MESSAGE =
  'Use `export default` instead of a TypeScript-only export form.'
const ANONYMOUS_DEFAULT_MESSAGE =
  'Name the default export: declare it first, then `export default name`.'

export const arrowFunctionRestrictions = [
  {
    selector: 'FunctionDeclaration',
    message:
      'Use an arrow function (`const name = () => …`) instead of a function declaration.',
  },
  {
    // Class members and object getters/setters have no arrow form; method
    // shorthand has its own selector below.
    selector:
      'FunctionExpression' +
      ':not(MethodDefinition > FunctionExpression)' +
      ':not(Property[method=true][kind="init"] > FunctionExpression)' +
      ':not(Property[kind=/^(get|set)$/] > FunctionExpression)',
    message: 'Use an arrow function instead of a function expression.',
  },
  {
    selector: 'Property[method=true][kind="init"]',
    message:
      'Use an arrow function property (`name: () => …`) instead of method shorthand.',
  },
  {
    selector: 'TSDeclareFunction',
    message:
      'Use a const typed with a callable interface instead of function overloads.',
  },
]

export const defaultExportRestrictions = [
  ...[
    'VariableDeclaration',
    'ClassDeclaration',
    'TSEnumDeclaration',
    'TSModuleDeclaration',
  ].map(node => ({
    selector: `ExportNamedDeclaration[source=null] > ${node}`,
    message: NAMED_EXPORT_MESSAGE,
  })),
  {
    selector:
      'ExportNamedDeclaration[source=null] > ExportSpecifier' +
      ':not([exported.name="default"]):not([exported.value="default"])',
    message: NAMED_EXPORT_MESSAGE,
  },
  ...[
    'ExportNamedDeclaration[source=null] > TSTypeAliasDeclaration',
    'ExportNamedDeclaration[source=null] > TSInterfaceDeclaration',
    'ExportDefaultDeclaration > TSInterfaceDeclaration',
  ].map(selector => ({ selector, message: TYPE_EXPORT_MESSAGE })),
  ...[
    'ExportNamedDeclaration[source=null] > TSImportEqualsDeclaration',
    'TSExportAssignment',
    'TSNamespaceExportDeclaration',
  ].map(selector => ({ selector, message: TS_EXPORT_MESSAGE })),
  ...[
    'ArrowFunctionExpression',
    'FunctionExpression[id=null]',
    'ClassDeclaration[id=null]',
    'ClassExpression[id=null]',
  ].map(node => ({
    selector: `ExportDefaultDeclaration > ${node}`,
    message: ANONYMOUS_DEFAULT_MESSAGE,
  })),
]

// Opt-in: append after baseConfig or reactConfig. Not suited for files whose
// framework requires named exports (Next.js App Router files, 'use server').
/** @type {import('eslint').Linter.Config[]} */
export const defaultExportConfig = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...arrowFunctionRestrictions,
        ...defaultExportRestrictions,
      ],
    },
  },
  {
    files: ['**/types.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...arrowFunctionRestrictions],
    },
  },
  {
    // Must stay last: it also undoes the general block above.
    files: ['**/*.d.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
]
