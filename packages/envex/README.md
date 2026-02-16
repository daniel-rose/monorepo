# envex

> Runtime environment variables for Next.js

[![npm version](https://img.shields.io/npm/v/@daniel-rose/envex.svg)](https://www.npmjs.com/package/@daniel-rose/envex)  
[![License](https://img.shields.io/npm/l/@daniel-rose/envex.svg)](https://github.com/daniel-rose/envex/blob/main/LICENSE)

Envex dynamically injects environment variables into your Next.js (>= 15) application at runtime.  
This approach follows the **"build once, deploy many"** principle, allowing the same build to be used across different environments without requiring rebuilds.  
Fully supports both client- and server-side usage with TypeScript.

## Installation

```bash
# npm
npm install @daniel-rose/envex

# yarn
yarn add @daniel-rose/envex

# pnpm
pnpm add @daniel-rose/envex
```

## Usage

### Client

Wrap your app in layout.tsx with EnvScript and EnvProvider to enable the useEnv hook:

```tsx
// app/layout.tsx
import { EnvScript } from "@daniel-rose/envex/script";
import { EnvexProvider } from "@daniel-rose/envex";
import { getPublicEnv } from "@daniel-rose/envex/server";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const initialEnv = await getPublicEnv()
    
    return (
        <html lang="en">
            <body>
                <EnvScript />
                <EnvexProvider initialEnv={initialEnv}>{children}</EnvexProvider>
            </body>
        </html>
    )
}
```

Then you can use useEnv anywhere in your client components:

```tsx
import { useEnv } from '@daniel-rose/envex'

export function Example() {
    const env = useEnv()
    return <div>{env['NEXT_PUBLIC_API_URL']}</div>
}
```

### Server

Access environment variables via callbacks:

```ts
import { getEnv, getEnvByName, getPublicEnv, getPublicEnvByName } from '@daniel-rose/envex/server'

const allEnv = getEnv()
const secret = getEnvByName('DATABASE_PASSWORD')

const onlyPublicEnv = getPublicEnv()
const apiUrl = getPublicEnvByName('NEXT_PUBLIC_API_URL')
```

## Example

See [examples/nextjs](https://github.com/daniel-rose/envex/tree/main/examples/nextjs) for a full integration.

## Testing

- Unit tests: Vitest
- End-to-end: Playwright

## License

MIT &copy; Daniel Rose

Links

- GitHub: https://github.com/daniel-rose/envex
- npm: https://www.npmjs.com/package/@daniel-rose/envex