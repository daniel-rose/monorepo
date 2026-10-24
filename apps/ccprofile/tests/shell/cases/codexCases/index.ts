import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect } from 'vitest'

import SCENARIO from '../../constants/SCENARIO'
import codexInvocation from '../../helpers/codexInvocation'
import type { HookCase } from '../../types'

const AFTER_UNSET = 'AFTER CODEX_HOME=<unset>'

// The `codex` function of hook v3: CODEX_HOME instead of CLAUDE_CONFIG_DIR,
// the account fallback, the fixed passthrough list.
const codexCases: readonly HookCase[] = [
  {
    title: 'starts codex with the codex home of the profile',
    test: async t => {
      t.writeConfig()

      const result = await t.run([], {
        cwd: t.dirs.private,
        scenario: SCENARIO.codex,
      })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([
        codexInvocation('private', join(t.home, '.codex-private')),
      ])
      expect(result.stdout).toContain(AFTER_UNSET)
    },
  },
  {
    title: 'starts codex with the codex home of the selected account',
    test: async t => {
      t.writeConfig()

      const result = await t.run(['hi'], {
        cwd: t.dirs.private,
        env: { CCPROFILE_ACCOUNT: 'seat-2' },
        scenario: SCENARIO.codex,
      })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([
        codexInvocation(
          'private',
          join(t.home, '.codex-private-2'),
          ['hi'],
          'seat-2'
        ),
      ])
    },
  },
  {
    title: 'starts codex without CODEX_HOME for a profile without codex',
    test: async t => {
      t.writeConfig()

      const result = await t.run([], {
        cwd: t.dirs.work,
        scenario: SCENARIO.codex,
      })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([codexInvocation('work', '')])
    },
  },
  {
    title: 'gives codex neither CLAUDE_CONFIG_DIR nor --mcp-config',
    test: async t => {
      t.writeConfig()
      mkdirSync(t.privateConfigDir, { recursive: true })
      writeFileSync(join(t.privateConfigDir, '.mcp.json'), '{}')

      const result = await t.run(['-p', 'hi'], {
        cwd: t.dirs.private,
        scenario: SCENARIO.codex,
      })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([
        codexInvocation('private', join(t.home, '.codex-private'), [
          '-p',
          'hi',
        ]),
      ])
    },
  },
  {
    title: 'passes codex -V straight through',
    test: async t => {
      t.writeConfig()

      const result = await t.run(['-V'], {
        cwd: t.dirs.private,
        scenario: SCENARIO.codex,
      })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([codexInvocation('', '', ['-V'])])
    },
  },
  {
    title: 'leaves an explicit CODEX_HOME alone',
    test: async t => {
      t.writeConfig()
      const own = join(t.home, 'own-codex')

      const result = await t.run(['hi'], {
        cwd: t.dirs.private,
        env: { CODEX_HOME: own },
        scenario: SCENARIO.codex,
      })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([codexInvocation('', own, ['hi'])])
      expect(result.stdout).toContain(`AFTER CODEX_HOME=${own}`)
    },
  },
  {
    title: 'follows CCPROFILE inside a claude session',
    test: async t => {
      t.writeConfig()
      const claudeDir = join(t.home, 'session-claude')

      const result = await t.run([], {
        cwd: t.dirs.elsewhere,
        env: { CCPROFILE: 'private', CLAUDE_CONFIG_DIR: claudeDir },
        scenario: SCENARIO.codex,
      })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([
        {
          ...codexInvocation('private', join(t.home, '.codex-private')),
          claudeConfigDir: claudeDir,
        },
      ])
    },
  },
  {
    title: 'does not start codex for an unknown account',
    test: async t => {
      t.writeConfig()

      const result = await t.run([], {
        cwd: t.dirs.private,
        env: { CCPROFILE_ACCOUNT: 'nope' },
        scenario: SCENARIO.codex,
      })

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain(
        'ccprofile: unknown account "nope" in profile "private"'
      )
      expect(t.invocations()).toEqual([])
    },
  },
]

export default codexCases
