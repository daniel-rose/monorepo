import { AUTH_TIMEOUT_MS, CHECK_STATUS, DOCTOR_TEXT } from '../../../constants'
import type { Check } from '../../types'

const LINE_BREAK = /\r?\n/

const checkClaudeOnPath: Check = async ctx => {
  const result = await ctx.runCommand('claude', ['--version'], {
    cwd: ctx.cwd,
    env: ctx.env,
    input: 'ignore',
    timeoutMs: AUTH_TIMEOUT_MS,
  })

  if (result.notFound) {
    return [{ status: CHECK_STATUS.fail, message: DOCTOR_TEXT.claudeMissing }]
  }
  if (result.timedOut) {
    return [{ status: CHECK_STATUS.warn, message: DOCTOR_TEXT.claudeTimedOut }]
  }
  if (result.exitCode !== 0) {
    const reason = result.stderr.split(LINE_BREAK)[0]?.trim() ?? ''
    return [
      {
        status: CHECK_STATUS.warn,
        message: DOCTOR_TEXT.claudeFailed(reason === '' ? undefined : reason),
      },
    ]
  }

  const version = result.stdout.split(LINE_BREAK)[0]?.trim()
  return [
    {
      status: CHECK_STATUS.ok,
      message: DOCTOR_TEXT.claudeOk(version === '' ? undefined : version),
    },
  ]
}

export default checkClaudeOnPath
