// eslint-disable-next-line import/no-anonymous-default-export
export default {
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: true,
  quoteProps: 'as-needed',
  jsxSingleQuote: true,
  trailingComma: 'es5',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  plugins: [import.meta.resolve('prettier-plugin-organize-imports')],
}
