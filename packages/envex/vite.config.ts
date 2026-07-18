import react from '@vitejs/plugin-react-swc'
import dts from 'unplugin-dts/vite'
import { defineConfig } from 'vite'

import pkg from './package.json' with { type: 'json' }

// Quell-Module mit 'use client'-Direktive (RSC). Wird pro Chunk geprüft, damit
// die Direktive genau auf dem Chunk landet, der den Client-Code enthält — nicht
// pauschal auf gemischten Entries (index re-exportiert auch server-sichere Utils).
const CLIENT_MODULE_SUFFIXES = [
  'src/react/EnvexProvider/index.tsx',
  'src/react/EnvexProvider/hooks/useEnv/index.ts',
  'src/react/EnvList/index.tsx',
]

// Externalisiert alle Peer-/Runtime-Deps inkl. Subpaths (z. B. next/*, @secretlint/*)
// sowie Node-Builtins — ersetzt rollup-plugin-node-externals nativ.
const external = [
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.dependencies ?? {}),
]
  .map(name => new RegExp(`^${name}(/.*)?$`))
  .concat(/^node:/)

// Setzt 'use client' auf jeden Chunk, der ein Client-Quellmodul enthält —
// ersetzt rollup-preserve-directives nativ und robust gegenüber Code-Splitting.
const banner = (chunk: { moduleIds?: string[] }) => {
  const hasClientModule = (chunk.moduleIds ?? []).some(id =>
    CLIENT_MODULE_SUFFIXES.some(suffix =>
      id.replace(/\\/g, '/').endsWith(suffix)
    )
  )

  return hasClientModule ? "'use client';\n" : ''
}

// https://vite.dev/config/
export default defineConfig({
  build: {
    lib: {
      name: '@daniel-rose/envex',
      entry: {
        index: 'src/index.ts',
        script: 'src/script.ts',
        server: 'src/server.ts',
        'dev-tools': 'src/dev-tools.ts',
      },
    },
    rollupOptions: {
      external,
      output: [
        {
          dir: './dist',
          format: 'cjs',
          entryFileNames: '[name].cjs',
          banner,
        },
        {
          dir: './dist',
          format: 'es',
          entryFileNames: '[name].js',
          banner,
        },
      ],
    },
  },
  plugins: [
    react(),
    dts({ tsconfigPath: './tsconfig.app.json', bundleTypes: true }),
  ],
})
