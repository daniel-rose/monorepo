import { afterEach, beforeEach, describe, it } from 'vitest'

import type { Shell } from '../../../../src/constants'
import { SHELL } from '../../../../src/constants'
import accountCases from '../../cases/accountCases'
import argumentCases from '../../cases/argumentCases'
import codexCases from '../../cases/codexCases'
import failureCases from '../../cases/failureCases'
import profileCases from '../../cases/profileCases'
import sessionCases from '../../cases/sessionCases'
import switchCases from '../../cases/switchCases'
import FAKE_VARIANT from '../../constants/FAKE_VARIANT'
import type { FakeVariant, HookCase } from '../../types'
import createHookContext from '../createHookContext'
import requestedShells from '../requestedShells'

const POWERSHELLS: readonly Shell[] = [SHELL.pwsh, SHELL.powershell]
const CASES: readonly HookCase[] = [
  ...profileCases,
  ...accountCases,
  ...argumentCases,
  ...failureCases,
  ...sessionCases,
  ...switchCases,
  ...codexCases,
]

// PowerShell on Windows runs claude.cmd and claude.exe; every other shell
// the sh script (Git Bash included).
const fakeVariantsFor = (shell: Shell): FakeVariant[] =>
  process.platform === 'win32' && POWERSHELLS.includes(shell)
    ? [FAKE_VARIANT.cmd, FAKE_VARIANT.exe]
    : [FAKE_VARIANT.posix]

// Registers the shared hook cases for one shell; skipped unless the shell is
// listed in CCPROFILE_TEST_SHELLS.
const defineHookSuite = (shell: Shell): void => {
  const isPowerShell = POWERSHELLS.includes(shell)

  describe.skipIf(!requestedShells().includes(shell))(`${shell} hook`, () => {
    describe.each(fakeVariantsFor(shell))('claude as %s', variant => {
      let context: Awaited<ReturnType<typeof createHookContext>>

      beforeEach(async () => {
        context = await createHookContext(shell, variant)
      })
      afterEach(() => context.cleanup())

      for (const hookCase of CASES) {
        const enabled = hookCase.runIf?.({ isPowerShell }) ?? true
        it.runIf(enabled)(hookCase.title, () => hookCase.test(context))
      }
    })
  })
}

export default defineHookSuite
