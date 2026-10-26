import type { Shell } from '../../src/constants'
import type FAKE_VARIANT from './constants/FAKE_VARIANT'
import type SCENARIO from './constants/SCENARIO'

export type FakeVariant = (typeof FAKE_VARIANT)[keyof typeof FAKE_VARIANT]

export type Scenario = (typeof SCENARIO)[keyof typeof SCENARIO]

export type ShellResult = {
  stdout: string
  stderr: string
  exitCode: number
}

// One run of the fake claude (or codex), as reported in FAKE_CLAUDE_LOG.
export type Invocation = {
  ccprofile: string
  ccprofileAccount: string
  claudeConfigDir: string
  codexHome: string
  ccprofileArgv: string
  tool: string
  args: string[]
}

export type RunOptions = {
  cwd: string
  env?: Record<string, string>
  stdin?: string
  scenario?: Scenario
  // false: PATH without the ccprofile shims.
  withShims?: boolean
}

// Per-test state of a hook suite: an isolated HOME with the directories
// below, the fake claude's log, and a runner for the shell under test.
export type HookContext = {
  shell: Shell
  variant: FakeVariant
  isPowerShell: boolean
  home: string
  dirs: { private: string; work: string; unicode: string; elsewhere: string }
  privateConfigDir: string
  writeConfig: () => void
  run: (args: string[], options: RunOptions) => Promise<ShellResult>
  invocations: () => Invocation[]
  // The complete environment of the last fake claude run.
  childEnv: () => Record<string, string>
  // The handoff file the fake claude filled (FAKE_CLAUDE_HANDOFF), as the
  // shell spelled it; undefined when it filled none.
  handoffFile: () => string | undefined
}

export type HookCase = {
  title: string
  // Restricts the case to some shells; default: all.
  runIf?: (context: { isPowerShell: boolean }) => boolean
  test: (t: HookContext) => Promise<void>
}

// Values the global setup hands to the shell tests.
declare module 'vitest' {
  interface ProvidedContext {
    shimDir: string
    hookDir: string
    nodeDir: string
    fakeDirs: Partial<Record<FakeVariant, string>>
  }
}
