import { describe, expect, it, vi } from 'vitest'

import type { ResolvedProfile } from '../../../src/config'
import { select } from '../../../src/prompt'
import selectProfile from '../../../src/resolve/selectProfile'
import createTestContext from '../../helpers/createTestContext'

vi.mock('../../../src/prompt')

const profile = (
  name: string,
  configDir: string | undefined,
  accounts: string[] = []
): ResolvedProfile => ({
  name,
  configDir,
  paths: [],
  remotes: [],
  accounts: accounts.map(account => ({
    name: account,
    configDir: `/home/jane/.claude-${account}`,
  })),
})

describe('selectProfile', () => {
  it('offers every profile with its configDir and accounts', async () => {
    const work = profile('work', undefined, ['work-2'])
    const priv = profile('private', '/home/jane/.claude-private')
    vi.mocked(select).mockResolvedValueOnce(priv)

    const picked = await selectProfile([work, priv], createTestContext())

    expect(picked).toBe(priv)
    expect(vi.mocked(select).mock.calls[0]?.[0]).toEqual({
      message: 'No Claude profile matches this directory, start with',
      choices: [
        {
          value: work,
          name: 'work',
          description: '~/.claude (default), accounts: work, work-2',
        },
        {
          value: priv,
          name: 'private',
          description: '/home/jane/.claude-private',
        },
      ],
    })
  })
})
