import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { defineConfig, type Plugin } from 'vite'
import { z } from 'zod'

import configSchema from './src/config/schema'

const SCHEMA_FILE_NAME = 'schema.json'
const JSON_INDENT = 2

// The zod schema is the single source; schema.json (published, referenced by
// `$schema` in configs) is generated from it. `io: 'input'` keeps defaulted
// keys optional.
const emitSchema = (): Plugin => {
  let root = process.cwd()

  return {
    name: 'ccprofile-emit-schema',
    configResolved: config => {
      root = config.root
    },
    closeBundle: () => {
      const jsonSchema = z.toJSONSchema(configSchema, { io: 'input' })
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
