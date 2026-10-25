import { describe, expect, it } from 'vitest'

import type { SelectedAccount } from '../../../src/resolve'
import formatResolveLine from '../../../src/resolve/formatResolveLine'
import createConfig from '../../helpers/createConfig'

const [privateProfile, workProfile] = createConfig([
  { name: 'private', configDir: '/home/jane/.claude-private' },
  { name: 'work' },
]).profiles

const claude = (
  profile: typeof privateProfile,
  account: SelectedAccount,
  mcpConfig?: string
) =>
  ({
    kind: 'profile',
    reason: 'match',
    selection: { kind: 'first' },
    tool: 'claude',
    profile,
    account,
    mcpConfig,
  }) as const

describe('formatResolveLine', () => {
  it('prints name, account, configDir and mcpConfig separated by TABs', () => {
    expect(
      formatResolveLine(
        claude(
          privateProfile,
          { name: 'seat-2', configDir: '/home/jane/.claude-private-2' },
          '/home/jane/.claude-private/.mcp.json'
        )
      )
    ).toBe(
      'private\tseat-2\t/home/jane/.claude-private-2\t/home/jane/.claude-private/.mcp.json\n'
    )
  })

  // An inherited CCPROFILE_ACCOUNT of the first account would otherwise
  // block `CCPROFILE=<other> claude` in a nested call.
  it('leaves the account empty for the first account', () => {
    expect(
      formatResolveLine(
        claude(privateProfile, {
          name: 'private',
          configDir: '/home/jane/.claude-private',
        })
      )
    ).toBe('private\t\t/home/jane/.claude-private\t\n')
  })

  it('keeps empty middle and trailing fields for the default profile', () => {
    expect(
      formatResolveLine(
        claude(workProfile, { name: 'work', configDir: undefined })
      )
    ).toBe('work\t\t\t\n')
  })

  it('prints the CODEX_HOME as dir and no mcpConfig for codex', () => {
    expect(
      formatResolveLine({
        kind: 'profile',
        reason: 'match',
        selection: { kind: 'first' },
        tool: 'codex',
        profile: privateProfile,
        account: { name: 'seat-2', configDir: '/home/jane/.claude-private-2' },
        codexHome: { dir: '/home/jane/.codex-private', source: 'profile' },
      })
    ).toBe('private\tseat-2\t/home/jane/.codex-private\t\n')
  })

  it('leaves the dir empty for ~/.codex', () => {
    expect(
      formatResolveLine({
        kind: 'profile',
        reason: 'match',
        selection: { kind: 'first' },
        tool: 'codex',
        profile: workProfile,
        account: { name: 'work', configDir: undefined },
        codexHome: { dir: undefined, source: 'default' },
      })
    ).toBe('work\t\t\t\n')
  })
})
