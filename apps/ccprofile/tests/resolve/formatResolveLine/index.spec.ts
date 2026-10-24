import { describe, expect, it } from 'vitest'

import formatResolveLine from '../../../src/resolve/formatResolveLine'

describe('formatResolveLine', () => {
  it('prints name and configDir separated by a TAB', () => {
    expect(
      formatResolveLine({
        name: 'private',
        configDir: '/home/jane/.claude-private',
        paths: [],
        remotes: [],
        accounts: [],
      })
    ).toBe('private\t/home/jane/.claude-private\n')
  })

  it('leaves the configDir empty for the default profile', () => {
    expect(
      formatResolveLine({
        name: 'work',
        configDir: undefined,
        paths: [],
        remotes: [],
        accounts: [],
      })
    ).toBe('work\t\n')
  })
})
