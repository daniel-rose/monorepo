import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect } from 'vitest'

import { SHELL } from '../../../../src/constants'
import invocation from '../../helpers/invocation'
import type { HookCase, HookContext } from '../../types'

const SESSION = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'

// The handoff the mod writes at /exit after /ccprofile-switch.
const handoff = (profile: string, account: string) =>
  JSON.stringify({ version: 1, profile, account, sessionId: SESSION })

// Git Bash on Windows spells the file as an MSYS path (/tmp/...), which
// node cannot check.
const expectRemoved = (t: HookContext): void => {
  const file = t.handoffFile()
  expect(file).toBeDefined()
  if (process.platform === 'win32' && t.shell === SHELL.bash) return
  expect(existsSync(file ?? '')).toBe(false)
}

// The hook v4 loop (spec §6): claude gets CCPROFILE_HANDOFF, and a filled
// handoff resumes the session on the next account.
const switchCases: readonly HookCase[] = [
  {
    title: 'resumes the session on the account of the handoff',
    test: async t => {
      t.writeConfig()

      const result = await t.run(['-p', 'hi'], {
        cwd: t.dirs.private,
        env: { FAKE_CLAUDE_HANDOFF: handoff('private', 'seat-2') },
      })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([
        invocation('private', t.privateConfigDir, ['-p', 'hi']),
        invocation(
          'private',
          join(t.home, '.claude-private-2'),
          ['--resume', SESSION],
          'seat-2'
        ),
      ])
      expect(result.stderr).toContain(
        'ccprofile: resuming session 0a1b2c3d as account "seat-2" of profile "private"'
      )
      expectRemoved(t)
    },
  },
  {
    title: 'resumes on the first account of the default profile',
    test: async t => {
      t.writeConfig()

      const result = await t.run([], {
        cwd: t.dirs.work,
        env: {
          CCPROFILE_ACCOUNT: 'work-2',
          FAKE_CLAUDE_HANDOFF: handoff('work', 'work'),
        },
      })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([
        invocation('work', join(t.home, '.claude-work-2'), [], 'work-2'),
        invocation('work', '', ['--resume', SESSION]),
      ])
      expect(t.childEnv()).not.toHaveProperty('CLAUDE_CONFIG_DIR')
    },
  },
  {
    title: 'passes --mcp-config=<file> before --resume',
    test: async t => {
      t.writeConfig()
      mkdirSync(t.privateConfigDir, { recursive: true })
      const file = join(t.privateConfigDir, '.mcp.json')
      writeFileSync(file, '{}')

      const result = await t.run([], {
        cwd: t.dirs.private,
        env: { FAKE_CLAUDE_HANDOFF: handoff('private', 'seat-2') },
      })

      expect(result.exitCode).toBe(0)
      expect(t.invocations().at(-1)?.args).toEqual([
        `--mcp-config=${file}`,
        '--resume',
        SESSION,
      ])
    },
  },
  {
    title: 'returns the exit status of the last claude',
    test: async t => {
      t.writeConfig()

      const result = await t.run([], {
        cwd: t.dirs.private,
        env: {
          FAKE_CLAUDE_EXIT: '3',
          FAKE_CLAUDE_HANDOFF: handoff('private', 'seat-2'),
        },
      })

      expect(result.exitCode).toBe(3)
      expect(t.invocations()).toHaveLength(2)
    },
  },
  {
    title: 'ends after a handoff it cannot follow',
    test: async t => {
      t.writeConfig()

      const result = await t.run([], {
        cwd: t.dirs.private,
        env: { FAKE_CLAUDE_HANDOFF: handoff('private', 'private') },
      })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([
        invocation('private', t.privateConfigDir),
      ])
      expect(result.stderr).toContain(
        `ccprofile: switch skipped (already on account "private") – resume by hand with "claude --resume ${SESSION}"`
      )
      expectRemoved(t)
    },
  },
  {
    title: 'gives passthrough arguments no handoff file',
    test: async t => {
      t.writeConfig()

      const result = await t.run(['--version'], {
        cwd: t.dirs.private,
        env: { FAKE_CLAUDE_HANDOFF: handoff('private', 'seat-2') },
      })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([invocation('', '', ['--version'])])
      expect(t.handoffFile()).toBeUndefined()
    },
  },
]

export default switchCases
