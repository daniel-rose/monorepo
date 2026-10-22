import { dirname, join } from 'node:path'

import type { Shell } from '../../../../src/constants'
import { SHELL } from '../../../../src/constants'
import createSandbox from '../../../helpers/createSandbox'
import HOOK_CONFIG from '../../constants/HOOK_CONFIG'
import type { FakeVariant, HookContext } from '../../types'
import createShellEnv from '../createShellEnv'
import readInvocations from '../readInvocations'
import runHook from '../runHook'
import writeShellConfig from '../writeShellConfig'

const POWERSHELLS: readonly Shell[] = [SHELL.pwsh, SHELL.powershell]

// Builds a fresh sandbox for one test; `cleanup` removes it.
const createHookContext = async (
  shell: Shell,
  variant: FakeVariant
): Promise<HookContext & { cleanup: () => Promise<void> }> => {
  const sandbox = await createSandbox()
  const { home } = sandbox
  const logPath = join(dirname(home), 'fake-claude.log')

  return {
    shell,
    variant,
    isPowerShell: POWERSHELLS.includes(shell),
    home,
    dirs: {
      private: sandbox.dir(join('Projects', 'private', 'x')),
      work: sandbox.dir(join('Projects', 'work')),
      unicode: sandbox.dir(join('Projects', 'unicode')),
      elsewhere: sandbox.dir('elsewhere'),
    },
    privateConfigDir: join(home, '.claude-private'),
    writeConfig: () => writeShellConfig(home, HOOK_CONFIG),
    run: (args, options) =>
      runHook(shell, args, {
        cwd: options.cwd,
        env: {
          ...createShellEnv(shell, {
            home,
            fakeVariant: variant,
            logPath,
            withShims: options.withShims,
          }),
          ...options.env,
        },
        stdin: options.stdin,
        scenario: options.scenario,
      }),
    invocations: () => readInvocations(logPath),
    cleanup: sandbox.cleanup,
  }
}

export default createHookContext
