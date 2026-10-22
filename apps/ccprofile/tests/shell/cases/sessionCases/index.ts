import { expect } from 'vitest'

import SCENARIO from '../../constants/SCENARIO'
import formatReport from '../../helpers/formatReport'
import invocation from '../../helpers/invocation'
import toShellPath from '../../helpers/toShellPath'
import type { HookCase } from '../../types'

const AFTER_UNSET =
  'AFTER CCPROFILE=<unset> CLAUDE_CONFIG_DIR=<unset> CCPROFILE_ARGV=<unset>'

// What the interactive session sees around the hook.
const sessionCases: readonly HookCase[] = [
  {
    title: 'captures only the output of claude',
    test: async t => {
      t.writeConfig()

      const result = await t.run(['-p', 'hi'], {
        cwd: t.dirs.private,
        scenario: SCENARIO.capture,
      })

      expect(result.exitCode).toBe(0)
      const report = formatReport(
        invocation('private', t.privateConfigDir, ['-p', 'hi'])
      )
      expect(result.stdout).toBe(`CAPTURED<<${report}>>\n`)
      // The configDir does not exist yet, so resolve did talk (on stderr).
      expect(result.stderr).toContain('ccprofile: creating new profile')
    },
  },
  {
    title: 'resolves per call and leaves the session untouched',
    test: async t => {
      t.writeConfig()

      const result = await t.run(
        [
          toShellPath(t.shell, t.dirs.private),
          toShellPath(t.shell, t.dirs.work),
        ],
        { cwd: t.dirs.elsewhere, scenario: SCENARIO.twoDirs }
      )

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([
        invocation('private', t.privateConfigDir),
        invocation('work', ''),
      ])
      expect(result.stdout).toContain(AFTER_UNSET)
    },
  },
  {
    // The PowerShell hook sets CCPROFILE_ARGV only around `ccprofile
    // resolve`; a value the session had is back before claude starts.
    title: 'restores a CCPROFILE_ARGV the session already had',
    runIf: ({ isPowerShell }) => isPowerShell,
    test: async t => {
      t.writeConfig()

      const result = await t.run([t.dirs.private, t.dirs.work], {
        cwd: t.dirs.elsewhere,
        env: { CCPROFILE_ARGV: 'keep' },
        scenario: SCENARIO.twoDirs,
      })

      expect(result.exitCode).toBe(0)
      expect(
        t.invocations().map(({ ccprofile, ccprofileArgv }) => ({
          ccprofile,
          ccprofileArgv,
        }))
      ).toEqual([
        { ccprofile: 'private', ccprofileArgv: 'keep' },
        { ccprofile: 'work', ccprofileArgv: 'keep' },
      ])
      expect(result.stdout).toContain(
        'AFTER CCPROFILE=<unset> CLAUDE_CONFIG_DIR=<unset> CCPROFILE_ARGV=keep'
      )
    },
  },
]

export default sessionCases
