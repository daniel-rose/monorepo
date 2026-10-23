import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import configSchema from '../../../src/config/schema'

type Node = { description?: string; properties?: Record<string, Node> }

// The same conversion vite.config.ts uses for the published schema.json.
const jsonSchema = z.toJSONSchema(configSchema, { io: 'input' }) as Node & {
  properties: Record<string, Node>
}

describe('config schema descriptions', () => {
  it('names only commands that exist', () => {
    const text = JSON.stringify(jsonSchema)
    expect(text).not.toContain('ccprofile use')
  })

  it('describes how passthrough entries match', () => {
    const description = jsonSchema.properties.passthrough?.description ?? ''
    expect(description).toContain(
      'Entries starting with `-` match any argument before a literal `--`'
    )
    expect(description).toContain('other entries match only the first argument')
  })
})
