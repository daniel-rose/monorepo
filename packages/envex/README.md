# envex

> Runtime environment variables for React applications

[![npm version](https://img.shields.io/npm/v/@daniel-rose/envex.svg)](https://www.npmjs.com/package/@daniel-rose/envex)
[![License](https://img.shields.io/npm/l/@daniel-rose/envex.svg)](https://github.com/daniel-rose/envex/blob/main/LICENSE)

Envex provides runtime access to environment variables in React applications via `window.ENV`.
This follows the **"build once, deploy many"** principle — the same build can be used across different environments without rebuilding.

Works with **Next.js** out of the box and with **any backend** (PHP, Python, Ruby, Go, etc.) that can render a `<script>` tag.

## Installation

```bash
npm install @daniel-rose/envex
# or
pnpm add @daniel-rose/envex
```

## Exports

| Export path                    | Requires Next.js | Description                                                    |
| ------------------------------ | ---------------- | -------------------------------------------------------------- |
| `@daniel-rose/envex`           | No               | `EnvexProvider`, `useEnv` hook, error classes, types           |
| `@daniel-rose/envex/dev-tools` | No               | `EnvList` debug component                                      |
| `@daniel-rose/envex/script`    | Yes              | `EnvScript` server component                                   |
| `@daniel-rose/envex/server`    | Yes              | `getEnv`, `getEnvByName`, `getPublicEnv`, `getPublicEnvByName` |

## Usage with Next.js

### Layout setup

Add `EnvScript` and `EnvexProvider` to your root layout:

```tsx
// app/layout.tsx
import { EnvScript } from '@daniel-rose/envex/script'
import { EnvexProvider } from '@daniel-rose/envex'
import { getPublicEnv } from '@daniel-rose/envex/server'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const initialEnv = await getPublicEnv()

  return (
    <html lang='en'>
      <body>
        <EnvScript />
        <EnvexProvider initialEnv={initialEnv}>{children}</EnvexProvider>
      </body>
    </html>
  )
}
```

`EnvScript` injects all `NEXT_PUBLIC_*` environment variables into `window.ENV` at runtime.
`initialEnv` provides the same values for SSR hydration.

### Client components

```tsx
import { useEnv } from '@daniel-rose/envex'

export function ApiUrl() {
  const env = useEnv()
  return <span>{env['NEXT_PUBLIC_API_URL']}</span>
}
```

### Server-side

```ts
import { getEnv, getPublicEnvByName } from '@daniel-rose/envex/server'

const allEnv = await getEnv()
const apiUrl = await getPublicEnvByName('NEXT_PUBLIC_API_URL')
```

## Usage without Next.js

For non-Next.js setups (React islands with PHP, Python, Ruby, etc.), your backend sets `window.ENV` directly via a `<script>` tag. No Next.js dependency is needed.

### Backend

Render a script tag that defines `window.ENV` before your React components mount:

```html
<script>
  window.ENV = <?= json_encode($envVars) ?>;
</script>
```

### React

Wrap your React tree with `EnvexProvider` — no `initialEnv` needed since there is no SSR hydration:

```tsx
import { EnvexProvider } from '@daniel-rose/envex'
import { useEnv } from '@daniel-rose/envex'

function App() {
  return (
    <EnvexProvider prefix={null}>
      <MyComponent />
    </EnvexProvider>
  )
}

function MyComponent() {
  const env = useEnv()
  return <span>{env['API_URL']}</span>
}
```

Set `prefix={null}` to disable the default `NEXT_PUBLIC_` filter, or use a custom prefix like `prefix="APP_"` to match your naming convention.

## API

### `EnvexProvider`

| Prop         | Type                                  | Default          | Description                                                                  |
| ------------ | ------------------------------------- | ---------------- | ---------------------------------------------------------------------------- |
| `initialEnv` | `Record<string, string \| undefined>` | `{}`             | Initial env for SSR hydration (Next.js). Optional for non-SSR setups.        |
| `prefix`     | `string \| null`                      | `'NEXT_PUBLIC_'` | Filter prefix for `initialEnv`. Set to `null` to pass all variables through. |
| `children`   | `ReactNode`                           | —                | Required                                                                     |

### `useEnv`

Returns the current environment variables as `Record<string, string | undefined>`. Must be used within an `EnvexProvider`.

## Example

See [examples/nextjs](https://github.com/daniel-rose/envex/tree/main/examples/nextjs) for a full Next.js integration.

## License

MIT &copy; Daniel Rose

## Links

- [GitHub](https://github.com/daniel-rose/envex)
- [npm](https://www.npmjs.com/package/@daniel-rose/envex)
