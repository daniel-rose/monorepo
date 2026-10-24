# @daniel-rose/eslint-config

> Shared ESLint configuration for TypeScript and React projects

[![npm version](https://img.shields.io/npm/v/@daniel-rose/eslint-config.svg)](https://www.npmjs.com/package/@daniel-rose/eslint-config)
[![License](https://img.shields.io/npm/l/@daniel-rose/eslint-config.svg)](https://github.com/daniel-rose/envex/blob/main/LICENSE)

Opinionated ESLint 10 flat config with TypeScript, Prettier integration, and an optional React preset.

## Installation

```bash
# npm
npm install @daniel-rose/eslint-config

# yarn
yarn add @daniel-rose/eslint-config

# pnpm
pnpm add @daniel-rose/eslint-config
```

Peer dependencies: `eslint ^10`
Optional peers (for React): `eslint-plugin-react-hooks` (`^7.1.0`), `eslint-plugin-react-refresh`, `eslint-plugin-jsx-a11y-x` (`^0.2.0`)
Optional peer (for Vitest): `@vitest/eslint-plugin` (`^1.6.0`)
Optional peer (for Tailwind CSS v4): `eslint-plugin-tailwindcss` (`^4.4.0`)

Still on ESLint 9? Stay on `@daniel-rose/eslint-config@2`.

Type declarations are included and use ESLint's own types, so the configs also work in an `eslint.config.ts` with `defineConfig` from `eslint/config`: `baseConfig`, `reactConfig`, `vitestConfig` and `defaultExportConfig` are `Linter.Config[]`, `tailwindConfig` is a function returning `Linter.Config[]`, and `sharedRules` is `Linter.RulesRecord`.

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

### Vitest (opt-in)

Append `vitestConfig` after `baseConfig` or `reactConfig`. It applies the `recommended` rules of `@vitest/eslint-plugin` (`no-focused-tests`, `expect-expect`, `valid-expect`, …) to `*.test.ts(x)` and `*.spec.ts(x)` files:

```js
// eslint.config.js
import { reactConfig } from '@daniel-rose/eslint-config/react'
import { vitestConfig } from '@daniel-rose/eslint-config/vitest'

export default [...reactConfig, ...vitestConfig]
```

### Tailwind CSS v4 (opt-in)

Append `tailwindConfig({ cssConfigPath })` after `baseConfig` or `reactConfig`. `cssConfigPath` is the CSS entry file that contains `@import 'tailwindcss'` (absolute or relative to the working directory). It applies the `recommended` rules of `eslint-plugin-tailwindcss` (`no-contradicting-classname`, `no-custom-classname`, `enforces-shorthand`, …):

```js
// eslint.config.js
import { reactConfig } from '@daniel-rose/eslint-config/react'
import { tailwindConfig } from '@daniel-rose/eslint-config/tailwind'

export default [
  ...reactConfig,
  ...tailwindConfig({ cssConfigPath: './src/styles/main.css' }),
]
```

`tailwindcss/classnames-order` is off: class order is left to `prettier-plugin-tailwindcss`, and two sorters fight each other. Without that Prettier plugin, turn the rule back on in a later block.

### Default exports only (opt-in)

Append `defaultExportConfig` after `baseConfig` or `reactConfig`:

```js
// eslint.config.js
import { defaultExportConfig } from '@daniel-rose/eslint-config'
import { reactConfig } from '@daniel-rose/eslint-config/react'

export default [...reactConfig, ...defaultExportConfig]
```

Each module then has a single, named default export (`const name = …` followed by `export default name`). Allowed besides that:

- re-exports (`export { default as name } from './name'`, `export * from './name'`), so barrel files need no configuration
- any export in `types.ts`, including `as const` objects next to their union type
- everything in `.d.ts` files

Exported types belong in `types.ts`. Anonymous default exports (`export default () => …`) and TypeScript-only export forms (`export =`, `export import`) are reported. Expressions such as `export default defineConfig({ … })` are fine.

Don't apply it to files whose framework requires named exports — Next.js App Router files (`page`, `layout`, `route`, …) and `'use server'` modules. In React files, `react-refresh/only-export-components` still warns about `export *` on its own.

### Included Rules

- `no-console` — only `warn` and `error` are allowed
- `@typescript-eslint/consistent-type-imports` — enforces `type` imports
- `no-restricted-syntax` — arrow functions only: no function declarations, function expressions, overloads or object method shorthand. Class members and getters/setters stay allowed; `.d.ts` files are exempt.
- Prettier integration via `eslint-plugin-prettier`
- React preset: the `recommended` rules of `eslint-plugin-react-hooks` in `.ts` and `.tsx` files, so custom hooks in their own `.ts` file are checked too
- React preset: accessibility checks via the `recommended` rules of `eslint-plugin-jsx-a11y-x` and `react-refresh/only-export-components`, both in `.tsx` files only

### Customizing `no-restricted-syntax`

ESLint replaces the whole selector list when a later config block sets `no-restricted-syntax` with selectors. To add your own selectors, or to turn off the default-export rules for some files, spread the exported lists again:

```js
import {
  arrowFunctionRestrictions,
  defaultExportConfig,
} from '@daniel-rose/eslint-config'
import { reactConfig } from '@daniel-rose/eslint-config/react'

export default [
  ...reactConfig,
  ...defaultExportConfig,
  {
    files: ['src/app/**'],
    rules: {
      'no-restricted-syntax': ['error', ...arrowFunctionRestrictions],
    },
  },
]
```

## Migrating to 5.0.0

`baseConfig` and `reactConfig` now require arrow functions. Rewrite `function` declarations and expressions as `const name = (…) => …`, object method shorthand as `name: (…) => …`, and type overloaded functions with a callable interface:

```ts
interface Parse {
  (value: string): string
  (value: number): number
}

const parse: Parse = (value: string | number) => value as never
```

## License

MIT &copy; Daniel Rose

Links

- GitHub: https://github.com/daniel-rose/envex
- npm: https://www.npmjs.com/package/@daniel-rose/eslint-config
