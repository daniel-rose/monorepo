import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'

import { vi } from 'vitest'

import { confirm, input, select } from '../../../src/prompt'
import type createSandbox from '../createSandbox'
import installFakeClaude from '../installFakeClaude'

type Sandbox = Awaited<ReturnType<typeof createSandbox>>

// Prompt answers and lookups for the `add` tests; the test file itself
// calls `vi.mock('…/src/prompt')`.
const addWizard = (sandbox: Sandbox) => ({
  // Fresh mocks: every select takes its preset (Enter), confirm says no.
  resetPrompts: () => {
    vi.mocked(input).mockReset()
    vi.mocked(select).mockReset()
    vi.mocked(confirm).mockReset()
    vi.mocked(select).mockImplementation(({ default: preset }) =>
      Promise.resolve(preset ?? null)
    )
    vi.mocked(confirm).mockResolvedValue(false)
  },
  ttyContext: (cwd: string) => {
    const stdin = Object.assign(new PassThrough(), { isTTY: true })
    const { env } = installFakeClaude(join(sandbox.home, '..'), 'loggedInEmail')
    return { ...sandbox.ctx(cwd, env), stdin }
  },
  answerInputs: (...answers: (string | null)[]) => {
    for (const answer of answers) vi.mocked(input).mockResolvedValueOnce(answer)
  },
  answerSelects: (...answers: unknown[]) => {
    for (const answer of answers) {
      vi.mocked(select).mockResolvedValueOnce(answer)
    }
  },
  inputConfig: (index: number) => {
    const config = vi.mocked(input).mock.calls[index]?.[0]
    if (config === undefined) throw new Error(`no input #${index}`)
    return config
  },
  selectConfig: (index: number) => {
    const config = vi.mocked(select).mock.calls[index]?.[0]
    if (config === undefined) throw new Error(`no select #${index}`)
    return config
  },
  readConfigText: () =>
    readFileSync(
      join(sandbox.home, '.config', 'ccprofile', 'config.json'),
      'utf8'
    ),
})

export default addWizard
