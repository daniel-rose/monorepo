import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import findCandidates from '../../../src/init/findCandidates'
import createSandbox from '../../helpers/createSandbox'

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox

beforeAll(async () => {
  sandbox = await createSandbox()
  writeFileSync(join(sandbox.home, '.claude.json'), '{}')
  writeFileSync(join(sandbox.dir('.claude-private'), '.claude.json'), '{}')
  sandbox.dir('.claude-empty')
})

afterAll(() => sandbox.cleanup())

describe('findCandidates', () => {
  it('lists the default and every .claude-* dir with a .claude.json', async () => {
    const candidates = await findCandidates(sandbox.ctx(sandbox.home))

    expect(candidates).toEqual([
      { configDir: undefined, suggestedName: 'default' },
      {
        configDir: join(sandbox.home, '.claude-private'),
        suggestedName: 'private',
      },
    ])
  })

  it('finds nothing in a bare home', async () => {
    const bare = await createSandbox()
    const candidates = await findCandidates(bare.ctx(bare.home))
    await bare.cleanup()

    expect(candidates).toEqual([])
  })
})
