import { loadConfig, usesCodex } from '../../../config'
import type { ExitCode } from '../../../constants'
import {
  ENV_VAR,
  EXIT_CODE,
  LOAD_STATUS,
  OUTCOME_KIND,
  TOOL,
} from '../../../constants'
import createSilentContext from '../../../context/createSilentContext'
import type { Context } from '../../../context/types'
import { resolveProfile } from '../../../resolve'
import failWith from '../failWith'
import formatCodexStatus from './formatCodexStatus'
import formatStatus from './formatStatus'

// Codex is shown once the config uses it, or when CODEX_HOME is set.
const showsCodex = async (ctx: Context): Promise<boolean> => {
  const value = ctx.env[ENV_VAR.codexHome]
  if (value !== undefined && value !== '') return true
  const loaded = await loadConfig(ctx)
  return loaded.status === LOAD_STATUS.ok && usesCodex(loaded.config)
}

type CodexLines = { lines: string[] } | { errors: string[] }

// The `codex:` line, resolved on its own: codex checks only CODEX_HOME, so
// it can get a profile where claude stays unchanged.
const codexLines = async (ctx: Context): Promise<CodexLines> => {
  if (!(await showsCodex(ctx))) return { lines: [] }
  const outcome = await resolveProfile([], createSilentContext(ctx), {
    interactive: false,
    tool: TOOL.codex,
  })
  if (outcome.kind === OUTCOME_KIND.error) return { errors: outcome.messages }
  const line = formatCodexStatus(outcome, ctx)
  return { lines: line === null ? [] : [line] }
}

// Which profile `claude` (and `codex`) would get here and why. Never prompts
// or reads stdin.
const status = async (ctx: Context): Promise<ExitCode> => {
  const outcome = await resolveProfile([], createSilentContext(ctx), {
    interactive: false,
  })
  if (outcome.kind === OUTCOME_KIND.error)
    return failWith(ctx, outcome.messages)

  const codex = await codexLines(ctx)
  if ('errors' in codex) return failWith(ctx, codex.errors)

  ctx.stdout.write(
    [formatStatus(outcome, ctx), ...codex.lines]
      .map(line => `${line}\n`)
      .join('')
  )
  return EXIT_CODE.ok
}

export default status
