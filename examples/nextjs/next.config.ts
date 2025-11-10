import type { NextConfig } from 'next'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

if (typeof __dirname === 'undefined') {
  global.__dirname = path.dirname(fileURLToPath(import.meta.url))
}

const resolveAlias = {
  '@daniel-rose/envex/scripts': path.resolve(
    __dirname,
    '../../packages/envex/src/scripts.ts'
  ),
  '@daniel-rose/envex/server': path.resolve(
    __dirname,
    '../../packages/envex/src/server.ts'
  ),
  '@daniel-rose/envex/dev-tools': path.resolve(
    __dirname,
    '../../packages/envex/src/dev-tools.ts'
  ),
  '@daniel-rose/envex': path.resolve(
    __dirname,
    '../../packages/envex/src/index.ts'
  ),
}

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(process.cwd(), '../../'),
  ...(process.env.NODE_ENV !== 'development'
    ? {}
    : {
        webpack: config => {
          config.resolve.alias = {
            ...config.resolve.alias,
            ...resolveAlias,
          }

          return config
        },
      }),
}

export default nextConfig
