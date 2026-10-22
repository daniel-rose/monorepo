import { expect } from 'vitest'

import SCENARIO from '../../constants/SCENARIO'
import type { HookCase } from '../../types'

// Whenever the hook cannot decide, claude is not started.
const failureCases: readonly HookCase[] = [
  {
    title: 'does not start claude when resolve fails',
    test: async t => {
      t.writeConfig()

      const result = await t.run([], {
        cwd: t.dirs.private,
        env: { CCPROFILE: 'missing' },
      })

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain('ccprofile: unknown profile "missing"')
      expect(t.invocations()).toEqual([])
    },
  },
  {
    title: 'aborts when ccprofile is not on PATH',
    test: async t => {
      t.writeConfig()

      const result = await t.run([], {
        cwd: t.dirs.private,
        withShims: false,
      })

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain('ccprofile: ccprofile not found')
      expect(t.invocations()).toEqual([])
    },
  },
  {
    // PowerShell owns its stdin, so the unread rest is checked in the POSIX
    // shells only.
    title: 'fails on piped stdin without a match and leaves it unread',
    test: async t => {
      t.writeConfig()

      const result = await t.run([], {
        cwd: t.dirs.elsewhere,
        stdin: 'data',
        scenario: SCENARIO.stdinRest,
      })

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain('ccprofile: no profile matches')
      expect(t.invocations()).toEqual([])
      if (!t.isPowerShell) expect(result.stdout).toContain('REST<<data>>')
    },
  },
]

export default failureCases
