# @daniel-rose/eslint-config

> Shared ESLint configuration for TypeScript and React projects

[![npm version](https://img.shields.io/npm/v/@daniel-rose/eslint-config.svg)](https://www.npmjs.com/package/@daniel-rose/eslint-config)
[![License](https://img.shields.io/npm/l/@daniel-rose/eslint-config.svg)](https://github.com/daniel-rose/envex/blob/main/LICENSE)

Opinionated ESLint 9 flat config with TypeScript, Prettier integration, and an optional React preset.

## Installation

```bash
# npm
npm install @daniel-rose/eslint-config

# yarn
yarn add @daniel-rose/eslint-config

# pnpm
pnpm add @daniel-rose/eslint-config
```

Peer dependencies: `eslint ^9`
Optional peers (for React): `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`

## Usage

### Base (TypeScript)

```js
// eslint.config.js
import { baseConfig } from '@daniel-rose/eslint-config'

export default [...baseConfig]
```

### React

```js
// eslint.config.js
import { reactConfig } from '@daniel-rose/eslint-config/react'

export default [...reactConfig]
```

### Included Rules

- `no-console` — only `warn` and `error` are allowed
- `@typescript-eslint/consistent-type-imports` — enforces `type` imports
- Prettier integration via `eslint-plugin-prettier`

## License

MIT &copy; Daniel Rose

Links

- GitHub: https://github.com/daniel-rose/envex
- npm: https://www.npmjs.com/package/@daniel-rose/eslint-config
