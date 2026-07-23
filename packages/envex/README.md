# envex

> Runtime environment variables for React applications

[![npm version](https://img.shields.io/npm/v/@daniel-rose/envex.svg)](https://www.npmjs.com/package/@daniel-rose/envex)
[![License](https://img.shields.io/npm/l/@daniel-rose/envex.svg)](https://github.com/daniel-rose/envex/blob/main/LICENSE)

Envex provides runtime access to environment variables in React applications via `window.ENV`.
This follows the **"build once, deploy many"** principle — the same build can be used across different environments without rebuilding.

Works with **Next.js** out of the box and with **any backend** (PHP, Python, Ruby, Go, etc.) that can render a `<script>` tag. Supports optional schema validation via any [Standard Schema](https://standardschema.dev)-compatible library (Zod, Valibot, ArkType, and more).

## Installation

```bash
npm install @daniel-rose/envex
# or
pnpm add @daniel-rose/envex
```

## Exports

| Export path                    | Requires Next.js | Description                                                                             |
| ------------------------------ | ---------------- | --------------------------------------------------------------------------------------- |
| `@daniel-rose/envex`           | No               | `EnvexProvider`, `useEnv` hook, `nativeFetchStrategy`, error classes, types             |
| `@daniel-rose/envex/dev-tools` | No               | `EnvList` debug component                                                               |
| `@daniel-rose/envex/script`    | Yes              | `EnvScript`, `InlineEnvScript` server components                                        |
| `@daniel-rose/envex/server`    | Yes              | `createEnvRouteHandler`, `getEnv`, `getEnvByName`, `getPublicEnv`, `getPublicEnvByName` |

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

`EnvScript` uses the Next.js `<Script>` component with `strategy="beforeInteractive"` to inject all `NEXT_PUBLIC_*` environment variables into `window.ENV` at runtime.
`initialEnv` provides the same values for SSR hydration.

Alternatively, use `InlineEnvScript` which renders a plain `<script>` tag instead of the Next.js `<Script>` component:

```tsx
import { InlineEnvScript } from '@daniel-rose/envex/script'

// use instead of <EnvScript /> in your layout
const script = <InlineEnvScript />
```

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

### REST route

Expose public environment variables via an API endpoint:

```ts
// app/api/env/route.ts
import { createEnvRouteHandler } from '@daniel-rose/envex/server'

export const GET = createEnvRouteHandler()

// with HTTP caching (5 minutes)
export const GET = createEnvRouteHandler({ maxAge: 300 })
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

### Fetching from an endpoint

Alternatively, use the `endpoint` prop to fetch env vars from a REST API instead of `window.ENV`:

```tsx
<EnvexProvider endpoint='/api/env'>
  <MyComponent />
</EnvexProvider>
```

This is useful for micro-frontends or SPAs that don't control the host page's script tags. When `endpoint` is set, `window.ENV` is ignored.

### Custom fetch strategy

The `fetchStrategy` prop replaces the built-in native `fetch` entirely, so you can plug in your own
HTTP client, retry logic, or caching layer. It receives the `endpoint` string and must resolve to an
env object:

```tsx
// axios
<EnvexProvider
  endpoint='/api/env'
  fetchStrategy={url => axios.get(url).then(r => r.data)}
>
  <MyComponent />
</EnvexProvider>
```

```tsx
// ky
<EnvexProvider endpoint='/api/env' fetchStrategy={url => ky.get(url).json()}>
  <MyComponent />
</EnvexProvider>
```

```tsx
// TanStack Query — the queryClient handles deduplication and caching via the queryKey
<EnvexProvider
  endpoint='/api/env'
  fetchStrategy={url =>
    queryClient.fetchQuery({
      queryKey: ['envex', url],
      queryFn: () => fetch(url).then(r => r.json()),
    })
  }
>
  <MyComponent />
</EnvexProvider>
```

When you inject a `fetchStrategy`, deduplication and caching are **your** responsibility — the
built-in module-level request cache only applies to the default native-fetch strategy. The default
strategy is also exported as `nativeFetchStrategy` if you want to compose with it. The `fetchStrategy`
prop may be an inline arrow function; it is read via a ref, so it never triggers a refetch on
re-render (a refetch only happens when `endpoint` changes).

## Validation

Envex supports optional schema validation via any library that implements the [Standard Schema](https://standardschema.dev) spec — including **Zod**, **Valibot**, **ArkType**, and **Effect Schema**.

When a schema is provided, envex validates the environment variables before making them available. If validation fails, an `EnvexValidationError` is thrown with the list of issues.

### Setup with Zod

```bash
npm install zod
```

Define your schema in a shared module:

```ts
// app/env.ts
import { z } from 'zod'

export const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_FEATURE_X: z.coerce.boolean().default(false),
})

export type AppEnv = z.output<typeof envSchema>
```

### Server-side validation (Next.js)

Pass the schema to server utilities — validation runs before the env is serialized or returned:

```tsx
// app/layout.tsx
import { EnvScript } from '@daniel-rose/envex/script'
import { EnvexProvider } from '@daniel-rose/envex'
import { getPublicEnv } from '@daniel-rose/envex/server'
import { envSchema } from './env'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const initialEnv = await getPublicEnv({ schema: envSchema })

  return (
    <html lang='en'>
      <body>
        <EnvScript schema={envSchema} />
        <EnvexProvider initialEnv={initialEnv}>{children}</EnvexProvider>
      </body>
    </html>
  )
}
```

```ts
// app/api/env/route.ts
import { createEnvRouteHandler } from '@daniel-rose/envex/server'
import { envSchema } from '../env'

export const GET = createEnvRouteHandler({ schema: envSchema })
```

### Client-side validation

Pass the schema to `EnvexProvider` — validation runs on `window.ENV` or the fetched endpoint response:

```tsx
import { EnvexProvider } from '@daniel-rose/envex'
import { envSchema } from './env'

;<EnvexProvider schema={envSchema}>
  <App />
</EnvexProvider>
```

### Type-safe access with `useEnv`

Use the generic overload to get the inferred output type from your schema:

```tsx
import { useEnv } from '@daniel-rose/envex'
import type { AppEnv } from './env'

export function ApiUrl() {
  const env = useEnv<typeof envSchema>()
  //    ^? AppEnv — fully typed, e.g. env.NEXT_PUBLIC_API_URL is string
  return <span>{env.NEXT_PUBLIC_API_URL}</span>
}
```

Or create a typed wrapper hook in your app:

```ts
// app/useAppEnv.ts
import { useEnv } from '@daniel-rose/envex'
import type { AppEnv } from './env'

export const useAppEnv = () => useEnv<typeof envSchema>()
```

### Error handling

`EnvexValidationError` is thrown when validation fails. Catch it in an [Error Boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) for graceful degradation:

```ts
import { EnvexValidationError } from '@daniel-rose/envex'

try {
  const env = await getPublicEnv({ schema: envSchema })
} catch (error) {
  if (error instanceof EnvexValidationError) {
    console.error(error.issues) // StandardSchemaV1.Issue[]
  }
}
```

## API

### `EnvexProvider`

| Prop            | Type                                  | Default          | Description                                                                                             |
| --------------- | ------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| `initialEnv`    | `Record<string, string \| undefined>` | `{}`             | Initial env for SSR hydration (Next.js). Optional for non-SSR setups.                                   |
| `prefix`        | `string \| null`                      | `'NEXT_PUBLIC_'` | Filter prefix for `initialEnv`. Set to `null` to pass all variables through.                            |
| `endpoint`      | `string`                              | —                | Fetch env vars from a REST endpoint instead of `window.ENV`. When set, `window.ENV` is ignored.         |
| `fetchStrategy` | `(endpoint: string) => Promise<Env>`  | —                | Custom fetcher; overrides the native fetch. Owns its own dedup/caching.                                 |
| `schema`        | `StandardSchemaV1`                    | —                | Optional schema. Validates `window.ENV` and fetched payloads. Throws `EnvexValidationError` on failure. |
| `children`      | `ReactNode`                           | —                | Required                                                                                                |

### `useEnv`

Returns the current environment variables as `Record<string, string | undefined>`. Must be used within an `EnvexProvider`.

Accepts an optional generic for type inference when a schema is used:

```ts
const env = useEnv<typeof envSchema>() // returns StandardSchemaV1.InferOutput<typeof envSchema>
```

### `createEnvRouteHandler`

Creates a Next.js route handler that returns public environment variables as JSON. Requires Next.js.

| Option   | Type               | Default     | Description                                             |
| -------- | ------------------ | ----------- | ------------------------------------------------------- |
| `maxAge` | `number`           | `undefined` | Sets `Cache-Control: public, max-age=<value>` header.   |
| `schema` | `StandardSchemaV1` | `undefined` | Validates env before serializing the response.          |
| `scan`   | `ScanConfig`       | `undefined` | Enable credential scanning (see below). Off by default. |

### `getEnv` / `getPublicEnv`

| Option       | Type               | Default     | Description                                                                                                                                                                                                                                                                                                                                |
| ------------ | ------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `schema`     | `StandardSchemaV1` | `undefined` | Validates the env and returns the schema's output type.                                                                                                                                                                                                                                                                                    |
| `prefix`     | `string \| null`   | `undefined` | **`getPublicEnv` only.** Filters returned keys to those starting with the given prefix. When `null` or `undefined`, no prefix filtering is applied and all public env keys are returned. Use this to restrict which variables are exposed — only keys matching the prefix are included, reducing the risk of leaking unintended variables. |
| `scan`       | `ScanConfig`       | `undefined` | **`getPublicEnv` only.** Enable credential scanning (see below). Off by default.                                                                                                                                                                                                                                                           |
| `connection` | `boolean`          | `true`      | Opt into Next.js dynamic rendering via `connection()` before reading `process.env`. Set to `false` to read the runtime env WITHOUT calling `connection()`.                                                                                                                                                                                 |

### `getEnvByName(name)` / `getPublicEnvByName(name, options?)`

By-name convenience readers. `getPublicEnvByName` accepts an options object as its second argument:

| Option       | Type         | Default     | Description                                                                                                           |
| ------------ | ------------ | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| `scan`       | `ScanConfig` | `undefined` | Enable credential scanning (see below). Off by default.                                                               |
| `connection` | `boolean`    | `true`      | Opt into dynamic rendering via `connection()`. Set to `false` to read the runtime env WITHOUT calling `connection()`. |

Passing `{ connection: false }` reads the **same runtime `process.env` value** (env stays dynamic — build-once, deploy-many); it only skips the dynamic-rendering opt-in. Use it where dynamic request APIs are forbidden — most notably streamed `generateMetadata`, which can run during the `after()` phase where `connection()`/`headers()`/`cookies()` throw `used <api>() inside after()`:

```ts
import { getPublicEnvByName } from '@daniel-rose/envex/server'

export const generateMetadata = async (): Promise<Metadata> => {
  const apiUrl = await getPublicEnvByName('NEXT_PUBLIC_API_URL', {
    connection: false,
  })
  // ...
}
```

> **`connection: false` does NOT make the value static.** The read still happens at request time against the live `process.env` (via dynamic key access, so the value is never inlined at build) — the same "build once, deploy many" behavior as the default. `connection()` only controls whether the route opts into dynamic rendering, not which value is read. This is verified end to end by the example app: it is built **without** `NEXT_PUBLIC_FOO` and served with it set at runtime, and `examples/nextjs/tests/dynamic-metadata.browser.spec.ts` asserts the runtime value reaches `generateMetadata`.
>
> Because `connection: false` skips the dynamic-rendering opt-in, ensure the route is dynamic by other means (a dynamic request API in the page, or `export const dynamic = 'force-dynamic'`); otherwise a fully prerenderable route could resolve `generateMetadata` at build time.

### `EnvScript` / `InlineEnvScript`

| Prop     | Type               | Default | Description                                                |
| -------- | ------------------ | ------- | ---------------------------------------------------------- |
| `schema` | `StandardSchemaV1` | —       | Validates public env before serializing into `window.ENV`. |
| `scan`   | `ScanConfig`       | —       | Enable credential scanning (see below). Off by default.    |

### `EnvexValidationError`

Thrown when schema validation fails. Extends `Error`.

| Property  | Type                       | Description                           |
| --------- | -------------------------- | ------------------------------------- |
| `issues`  | `StandardSchemaV1.Issue[]` | The list of validation issues.        |
| `message` | `string`                   | Human-readable summary of all issues. |

## Credential scanning

The public-env filter is **name-based** (`NEXT_PUBLIC_` prefix). That does not protect you
from accidentally exposing a secret whose name happens to carry the public prefix
(`NEXT_PUBLIC_DB_PASSWORD=…`) or from setting `prefix={null}`.

As an **opt-in** second line of defense, envex can scan the values that are about to be shipped
to the client **before** they are serialized into `window.ENV` (or the route-handler response).
On a hit it throws an `EnvexCredentialLeakError` so the build/render fails instead of leaking the
secret. Error messages and findings contain **only the variable name**, never the value.

Scanning is **disabled by default** (enabling it is a non-breaking upgrade). Turn it on at any
server-side emission point by passing `scan`:

```tsx
;<EnvScript scan /> // built-in engine, default settings
export const GET = createEnvRouteHandler({ scan: true })
const env = await getPublicEnv({ scan: true })
```

It is only meaningful server-side; `EnvexProvider` (client) never scans, since by then the value
has already been shipped.

### Engines

Two engines, selectable via `scan.engine`:

- **`'builtin'`** (default) — zero-dependency. Flags PEM private keys, known secret tokens
  (`sk_live_…`, GitHub/Slack tokens, AWS access keys), credentials embedded in URLs
  (`user:pass@host`), and high-entropy opaque tokens. Legitimately public tokens (`pk_live_…`,
  Google `AIza…` keys, Sentry DSNs, `G-…`/`UA-` ids) are exempt from the entropy heuristic.
- **`'secretlint'`** — delegates to [secretlint](https://github.com/secretlint/secretlint)'s
  recommended preset for much broader provider coverage. Requires the optional peer dependencies
  `@secretlint/core` and `@secretlint/secretlint-rule-preset-recommend`:

  ```bash
  pnpm add -D @secretlint/core @secretlint/secretlint-rule-preset-recommend
  ```

  ```tsx
  export const GET = createEnvRouteHandler({ scan: { engine: 'secretlint' } })
  ```

### Configuring

```tsx
<EnvScript
  scan={{
    engine: 'builtin', // or 'secretlint'
    allowlist: ['NEXT_PUBLIC_HIGH_ENTROPY_BUT_PUBLIC'],
    patterns: [/mycorp_secret_[a-z0-9]+/], // built-in engine only
    entropyThreshold: 4.5, // or `false` to disable; built-in engine only
  }}
/>
```

The `scan` option is accepted by `EnvScript`, `InlineEnvScript`, `createEnvRouteHandler({ scan })`,
`getPublicEnv({ scan })` and `getPublicEnvByName(name, { scan })`. The primitives `scanForCredentials(env, options)`
(sync, built-in) and `assertNoCredentialLeak(env, scan)` (async, engine-aware) are also exported for
running the scan yourself.

`ScanConfig` is `boolean | ScanOptions`: `true` enables with defaults, an object configures it,
absent/`false` disables.

| `ScanOptions`      | Type                        | Default     | Description                                                                 |
| ------------------ | --------------------------- | ----------- | --------------------------------------------------------------------------- |
| `engine`           | `'builtin' \| 'secretlint'` | `'builtin'` | Detection engine.                                                           |
| `allowlist`        | `string[]`                  | `[]`        | Env variable names that are known safe and skip scanning.                   |
| `patterns`         | `RegExp[]`                  | `[]`        | Additional secret patterns (built-in engine only).                          |
| `entropyThreshold` | `number \| false`           | `4`         | Shannon-entropy threshold (bits/char); `false` disables it (built-in only). |

## Example

See [examples/nextjs](https://github.com/daniel-rose/envex/tree/main/examples/nextjs) for a full Next.js integration.

## License

MIT &copy; Daniel Rose

## Links

- [GitHub](https://github.com/daniel-rose/envex)
- [npm](https://www.npmjs.com/package/@daniel-rose/envex)
