import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig, type Plugin, runnerImport } from 'vite'
import { z } from 'zod'

const SCHEMA_FILE_NAME = 'schema.json'
const SCHEMA_MODULE = fileURLToPath(
  new URL('./src/config/schema/index.ts', import.meta.url)
)
const JSON_INDENT = 2

// The zod schema is the single source; schema.json (published, referenced by
// `$schema` in configs) is generated from it. The module is loaded through
// Vite's module runner so this config statically imports nothing from src/.
// `io: 'input'` keeps defaulted keys optional.
const emitSchema = (): Plugin => {
  let root = process.cwd()

  return {
    name: 'ccprofile-emit-schema',
    configResolved: config => {
      root = config.root
    },
    closeBundle: async () => {
      const { module } = await runnerImport<{ default: z.ZodType }>(
        SCHEMA_MODULE,
        { configFile: false, logLevel: 'silent' }
      )
      const jsonSchema = z.toJSONSchema(module.default, { io: 'input' })
      writeFileSync(
        join(root, SCHEMA_FILE_NAME),
        `${JSON.stringify(jsonSchema, null, JSON_INDENT)}\n`
      )
    },
  }
}

export default defineConfig({
  plugins: [emitSchema()],
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
