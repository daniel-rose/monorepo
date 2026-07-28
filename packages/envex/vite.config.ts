import react from '@vitejs/plugin-react-swc'
import { dts } from 'rolldown-plugin-dts'
import { defineConfig } from 'vite'

import pkg from './package.json' with { type: 'json' }

// Source modules carrying the 'use client' directive (RSC).
const CLIENT_MODULE_SUFFIXES = [
  'src/react/EnvexProvider/index.tsx',
  'src/react/EnvexProvider/hooks/useEnv/index.ts',
  'src/react/EnvList/index.tsx',
]

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const isClientModule = (id: string) =>
  CLIENT_MODULE_SUFFIXES.some(suffix => id.replace(/\\/g, '/').endsWith(suffix))

// Externalize every peer/runtime dependency incl. subpaths (e.g. next/*,
// @secretlint/*) and node builtins — the Rolldown-native replacement for
// rollup-plugin-node-externals.
const external = [
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.dependencies ?? {}),
]
  .map(name => new RegExp(`^${escapeRegExp(name)}(/.*)?$`))
  .concat(/^node:/)

// rolldown-plugin-dts emits declaration chunks whose names end in '.d' (e.g. a
// shared chunk 'shared.d'). They must keep the '.ts' extension so code-split
// multi-entry packages produce 'shared.d.ts' instead of a broken 'shared.d.js';
// everything else is a normal '.js' chunk.
const entryFileNames = (chunk: { name: string }): string =>
  chunk.name.endsWith('.d') ? '[name].ts' : '[name].js'

// Shared (non-entry) declaration chunks must not collide with entry names:
// rolldown-plugin-dts could name a shared type chunk 'index.d', which would then
// steal 'index.d.ts' from the real 'index' entry. Inserting '-chunk' before the
// '.d' keeps shared chunks clear of entry names.
const chunkFileNames = (chunk: { name: string }): string =>
  chunk.name.endsWith('.d')
    ? `${chunk.name.slice(0, -2)}-chunk.d.ts`
    : '[name].js'

// Adds 'use client' to every chunk that contains a client source module —
// a native, code-splitting-robust replacement for rollup-preserve-directives.
// No manual chunking: the client components live in src/react/ and get split
// into their own chunk anyway. A forced client chunk via manualChunks would
// pull shared server-safe utils in and move them behind the 'use client'
// boundary (server calls then break at runtime).
const banner = (chunk: { moduleIds?: string[] }) =>
  (chunk.moduleIds ?? []).some(isClientModule) ? "'use client';\n" : ''

// https://vite.dev/config/
export default defineConfig({
  // rolldown-plugin-dts requires the generated declarations to be left untouched
  // by Vite's Oxc transform — otherwise the barrels' re-export chains break
  // (MISSING_EXPORT). oxc.exclude overrides the default list, so JS files must be
  // listed as well.
  oxc: {
    exclude: [/\.js$/, /\.d\.[cm]?ts$/],
  },
  build: {
    lib: {
      name: '@daniel-rose/envex',
      // ESM-only: rolldown-plugin-dts cannot bundle dts for the cjs format.
      // Without this, Vite additionally emits a cjs output for multi-entry libs.
      formats: ['es'],
      entry: {
        index: 'src/index.ts',
        script: 'src/script.ts',
        server: 'src/server.ts',
        'dev-tools': 'src/dev-tools.ts',
      },
    },
    rollupOptions: {
      external,
      output: {
        dir: './dist',
        format: 'es',
        entryFileNames,
        chunkFileNames,
        banner,
      },
    },
  },
  plugins: [react(), dts({ tsconfig: './tsconfig.app.json' })],
})
