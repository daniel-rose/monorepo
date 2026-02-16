# @daniel-rose/prettier-config

> Shared Prettier configuration

[![npm version](https://img.shields.io/npm/v/@daniel-rose/prettier-config.svg)](https://www.npmjs.com/package/@daniel-rose/prettier-config)
[![License](https://img.shields.io/npm/l/@daniel-rose/prettier-config.svg)](https://github.com/daniel-rose/envex/blob/main/LICENSE)

Opinionated Prettier configuration with the `prettier-plugin-organize-imports` plugin.

## Installation

```bash
# npm
npm install @daniel-rose/prettier-config

# yarn
yarn add @daniel-rose/prettier-config

# pnpm
pnpm add @daniel-rose/prettier-config
```

Peer dependency: `prettier ^3`

## Usage

In your `.prettierrc.js`:

```js
import baseConfig from '@daniel-rose/prettier-config'

export default { ...baseConfig }
```

### Configuration Values

| Option | Value |
|--------|-------|
| `tabWidth` | `2` |
| `useTabs` | `false` |
| `semi` | `false` |
| `singleQuote` | `true` |
| `quoteProps` | `as-needed` |
| `jsxSingleQuote` | `true` |
| `trailingComma` | `es5` |
| `bracketSpacing` | `true` |
| `bracketSameLine` | `false` |
| `arrowParens` | `avoid` |

Plugins: `prettier-plugin-organize-imports`

## License

MIT &copy; Daniel Rose

Links

- GitHub: https://github.com/daniel-rose/envex
- npm: https://www.npmjs.com/package/@daniel-rose/prettier-config
