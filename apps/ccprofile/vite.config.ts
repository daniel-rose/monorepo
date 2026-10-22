import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    ssr: 'src/index.ts',
    target: 'node24',
    rollupOptions: {
      external: [/^node:/],
      output: {
        entryFileNames: 'index.js',
        banner: '#!/usr/bin/env node',
      },
    },
  },
  ssr: {
    noExternal: true,
    target: 'node',
  },
})
