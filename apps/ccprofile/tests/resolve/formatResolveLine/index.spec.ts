import { describe, expect, it } from 'vitest'

import formatResolveLine from '../../../src/resolve/formatResolveLine'
import createConfig from '../../helpers/createConfig'

const [privateProfile, workProfile] = createConfig([
  { name: 'private', configDir: '/home/jane/.claude-private' },
  { name: 'work' },
]).profiles

describe('formatResolveLine', () => {
  it('prints name, account, configDir and mcpConfig separated by TABs', () => {
    expect(
      formatResolveLine({
        profile: privateProfile,
        account: { name: 'seat-2', configDir: '/home/jane/.claude-private-2' },
        mcpConfig: '/home/jane/.claude-private/.mcp.json',
      })
    ).toBe(
      'private\tseat-2\t/home/jane/.claude-private-2\t/home/jane/.claude-private/.mcp.json\n'
    )
  })

  // An inherited CCPROFILE_ACCOUNT of the first account would otherwise
  // block `CCPROFILE=<other> claude` in a nested call.
  it('leaves the account empty for the first account', () => {
    expect(
      formatResolveLine({
        profile: privateProfile,
        account: { name: 'private', configDir: '/home/jane/.claude-private' },
        mcpConfig: undefined,
      })
    ).toBe('private\t\t/home/jane/.claude-private\t\n')
  })

  it('keeps empty middle and trailing fields for the default profile', () => {
    expect(
      formatResolveLine({
        profile: workProfile,
        account: { name: 'work', configDir: undefined },
        mcpConfig: undefined,
      })
    ).toBe('work\t\t\t\n')
  })
})
