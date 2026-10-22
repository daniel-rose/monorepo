import { join } from 'node:path'

import { expect } from 'vitest'

import invocation from '../../helpers/invocation'
import type { HookCase } from '../../types'

// Which CCPROFILE / CLAUDE_CONFIG_DIR claude gets.
const profileCases: readonly HookCase[] = [
  {
    // R15: entry `~/Projects/private`, cwd <HOME>\Projects\private\x on
    // Windows.
    title: 'starts claude with the profile matched by path',
    test: async t => {
      t.writeConfig()

      const result = await t.run([], { cwd: t.dirs.private })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([
        invocation('private', t.privateConfigDir),
      ])
    },
  },
  {
    title: 'sets only CCPROFILE for the default profile',
    test: async t => {
      t.writeConfig()

      const result = await t.run([], { cwd: t.dirs.work })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([invocation('work', '')])
    },
  },
  {
    title: 'starts claude unchanged without a config',
    test: async t => {
      const result = await t.run([], { cwd: t.dirs.private })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([invocation('', '')])
    },
  },
  {
    title: 'passes a non-ASCII configDir unchanged',
    test: async t => {
      t.writeConfig()

      const result = await t.run([], { cwd: t.dirs.unicode })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([
        invocation('unicode', join(t.home, '.claude-ü')),
      ])
    },
  },
  {
    title: 'inherits CCPROFILE from a parent claude',
    test: async t => {
      t.writeConfig()

      const result = await t.run([], {
        cwd: t.dirs.private,
        env: { CCPROFILE: 'work' },
      })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([invocation('work', '')])
    },
  },
  {
    title: 'treats an empty CCPROFILE as unset',
    test: async t => {
      t.writeConfig()

      const result = await t.run([], {
        cwd: t.dirs.private,
        env: { CCPROFILE: '' },
      })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([
        invocation('private', t.privateConfigDir),
      ])
    },
  },
]

export default profileCases
