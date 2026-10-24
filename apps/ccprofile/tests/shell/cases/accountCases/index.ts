import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect } from 'vitest'

import invocation from '../../helpers/invocation'
import type { HookCase } from '../../types'

const writeMcpConfig = (dir: string): string => {
  mkdirSync(dir, { recursive: true })
  const file = join(dir, '.mcp.json')
  writeFileSync(file, '{}')
  return file
}

// Which account claude gets and how the `name<TAB>account<TAB>configDir<TAB>
// mcpConfig` line (protocol 2) is split, empty fields included.
const accountCases: readonly HookCase[] = [
  {
    title: 'starts claude with the account from CCPROFILE_ACCOUNT',
    test: async t => {
      t.writeConfig()

      const result = await t.run([], {
        cwd: t.dirs.private,
        env: { CCPROFILE_ACCOUNT: 'seat-2' },
      })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([
        invocation('private', join(t.home, '.claude-private-2'), [], 'seat-2'),
      ])
    },
  },
  {
    title: 'starts a further account of the default profile',
    test: async t => {
      t.writeConfig()

      const result = await t.run([], {
        cwd: t.dirs.work,
        env: { CCPROFILE_ACCOUNT: 'work-2' },
      })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([
        invocation('work', join(t.home, '.claude-work-2'), [], 'work-2'),
      ])
    },
  },
  {
    title: 'does not start claude for an unknown account',
    test: async t => {
      t.writeConfig()

      const result = await t.run([], {
        cwd: t.dirs.private,
        env: { CCPROFILE_ACCOUNT: 'nope' },
      })

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain(
        'ccprofile: unknown account "nope" in profile "private"'
      )
      expect(t.invocations()).toEqual([])
    },
  },
  {
    // `--mcp-config` is variadic: only the `=` form keeps it from eating the
    // user's arguments, and it goes before a user `--`.
    title: 'puts --mcp-config=<file> before the user arguments',
    test: async t => {
      t.writeConfig()
      const file = writeMcpConfig(t.privateConfigDir)

      const result = await t.run(['-p', '--', 'hi'], {
        cwd: t.dirs.private,
        env: { CCPROFILE_ACCOUNT: 'seat-2' },
      })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([
        invocation(
          'private',
          join(t.home, '.claude-private-2'),
          [`--mcp-config=${file}`, '-p', '--', 'hi'],
          'seat-2'
        ),
      ])
    },
  },
  {
    // Line `work<TAB>work<TAB><TAB><file>`: empty field in the middle.
    title: 'keeps an empty configDir field before the mcpConfig field',
    test: async t => {
      t.writeConfig()
      const file = writeMcpConfig(join(t.home, '.claude'))

      const result = await t.run(['hi'], { cwd: t.dirs.work })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([
        invocation('work', '', [`--mcp-config=${file}`, 'hi']),
      ])
    },
  },
  {
    title: 'adds no --mcp-config to passthrough arguments',
    test: async t => {
      t.writeConfig()
      writeMcpConfig(t.privateConfigDir)

      const result = await t.run(['--version'], { cwd: t.dirs.private })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([invocation('', '', ['--version'])])
    },
  },
]

export default accountCases
