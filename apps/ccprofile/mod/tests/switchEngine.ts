import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'
import { mock } from 'claude-code/testing'

import SWITCH_FIXTURE from './switch.fixture'

const HANDOFF_FILE = '/tmp/ccprofile-handoff.abc123'
const NOW = Date.UTC(2026, 9, 25, 12, 0, 0)

type Run = {
  exitCode: number
  stdout: string
  stderr: string
  isStdoutTruncated: false
  isStderrTruncated: false
}
type Engineered = { written: string[]; runs: string[][]; toasts: string[] }

// What `ccprofile switch --json` answers: its exit code and streams.
const ran = (exitCode: number, stdout: string, stderr = ''): Run => ({
  exitCode,
  stdout,
  stderr,
  isStdoutTruncated: false,
  isStderrTruncated: false,
})

const answered = (plan: object): Run => ran(0, `${JSON.stringify(plan)}\n`)

// The engine beneath the mod: env, clock, the command registration, the
// session's start, end and measurements, `ccprofile switch` answering from
// `answer` (called once per run), and every handoff write and toast
// recorded.
const setUp = (
  on: On,
  env: Readonly<Record<string, string>>,
  answer: () => Run = () => answered(SWITCH_FIXTURE.plan)
): Engineered => {
  const engineered: Engineered = { written: [], runs: [], toasts: [] }
  mock.env(on, env)
  mock.clock(on, { now: NOW })
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('process.run', (_, e) => {
    engineered.runs.push([...e.argv])
    return { value: answer() }
  })
  on('fs.write', (_, e) => {
    if (e.path === HANDOFF_FILE) engineered.written.push(e.text)
    return { value: undefined }
  })
  on('ui.toast', (_, e) => {
    engineered.toasts.push(e.text)
    return { value: undefined }
  })
  return engineered
}

const start = ($: Engine) =>
  $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })

const switchCommand = async ($: Engine, args = '') =>
  (
    await $.command.run({
      command: 'ccprofile-switch',
      args,
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 80 },
    })
  ).text

const end = ($: Engine, reason: 'prompt_input_exit' | 'clear') =>
  $.session.end({
    reason,
    sessionId: SWITCH_FIXTURE.handoff.sessionId,
    resume: { id: SWITCH_FIXTURE.handoff.sessionId },
  })

const measure = ($: Engine, percentUsed: number) =>
  $.session.measure({
    context: { window: 200_000 },
    rateLimits: [
      { kind: 'five_hour', percentUsed, resetsAt: '2026-10-25T14:30:00Z' },
    ],
    changed: ['rateLimits'],
  })

// The switch tests' engine and the session acts they drive.
const switchEngine = {
  underHook: { CCPROFILE_HANDOFF: HANDOFF_FILE },
  ran,
  answered,
  setUp,
  start,
  switchCommand,
  end,
  measure,
} as const

export default switchEngine
