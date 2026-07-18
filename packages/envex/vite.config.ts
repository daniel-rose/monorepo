import react from '@vitejs/plugin-react-swc'
import dts from 'unplugin-dts/vite'
import { defineConfig } from 'vite'

import pkg from './package.json' with { type: 'json' }

// Quell-Module mit 'use client'-Direktive (RSC).
const CLIENT_MODULE_SUFFIXES = [
  'src/react/EnvexProvider/index.tsx',
  'src/react/EnvexProvider/hooks/useEnv/index.ts',
  'src/react/EnvList/index.tsx',
]

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const isClientModule = (id: string) =>
  CLIENT_MODULE_SUFFIXES.some(suffix => id.replace(/\\/g, '/').endsWith(suffix))

// Externalisiert alle Peer-/Runtime-Deps inkl. Subpaths (z. B. next/*, @secretlint/*)
// sowie Node-Builtins — ersetzt rollup-plugin-node-externals nativ.
const external = [
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.dependencies ?? {}),
]
  .map(name => new RegExp(`^${escapeRegExp(name)}(/.*)?$`))
  .concat(/^node:/)

// Setzt 'use client' auf jeden Chunk, der ein Client-Quellmodul enthält —
// ersetzt rollup-preserve-directives nativ und robust gegenüber Code-Splitting.
// Kein manuelles Chunking: die Client-Komponenten liegen in src/react/ und werden
// von Vite ohnehin in einen eigenen Chunk gesplittet. Ein erzwungener Client-Chunk
// via manualChunks würde geteilte server-sichere Utils mit hineinziehen und hinter
// die 'use client'-Grenze verschieben (Server-Aufruf bricht dann zur Laufzeit).
const banner = (chunk: { moduleIds?: string[] }) =>
  (chunk.moduleIds ?? []).some(isClientModule) ? "'use client';\n" : ''

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
