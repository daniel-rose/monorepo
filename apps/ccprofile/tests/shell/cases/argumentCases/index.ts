import { expect } from 'vitest'

import FAKE_VARIANT from '../../constants/FAKE_VARIANT'
import TEST_ENV from '../../constants/TEST_ENV'
import invocation from '../../helpers/invocation'
import type { HookCase } from '../../types'

const TRICKY_ARGS = ['', 'a b', '$()', '*', 'ü', '-p', '--']
const EXIT_CODES = [0, 1, 42, 130]

const withoutEmpty = (args: readonly string[]): string[] =>
  args.filter(arg => arg !== '')

// Arguments reach claude untouched; its exit code is the hook's.
const argumentCases: readonly HookCase[] = [
  {
    // cmd.exe drops empty arguments itself, so the .cmd fake is checked for
    // the others only; the .exe fake must get all of them.
    title: 'passes the arguments unchanged and in order',
    test: async t => {
      t.writeConfig()

      const result = await t.run(TRICKY_ARGS, { cwd: t.dirs.private })

      expect(result.exitCode).toBe(0)
      const [called] = t.invocations()
      expect(called.ccprofile).toBe('private')
      if (t.variant === FAKE_VARIANT.cmd) {
        expect(withoutEmpty(called.args)).toEqual(withoutEmpty(TRICKY_ARGS))
      } else {
        expect(called.args).toEqual(TRICKY_ARGS)
      }
    },
  },
  {
    title: 'passes a single argument',
    test: async t => {
      t.writeConfig()

      const result = await t.run(['x'], { cwd: t.dirs.private })

      expect(result.exitCode).toBe(0)
      expect(t.invocations()).toEqual([
        invocation('private', t.privateConfigDir, ['x']),
      ])
    },
  },
  ...EXIT_CODES.map((code): HookCase => ({
    title: `returns claude exit code ${code}`,
    test: async t => {
      t.writeConfig()

      const result = await t.run([], {
        cwd: t.dirs.private,
        env: { [TEST_ENV.fakeExit]: String(code) },
      })

      expect(result.exitCode).toBe(code)
      expect(t.invocations()).toHaveLength(1)
    },
  })),
]

export default argumentCases
