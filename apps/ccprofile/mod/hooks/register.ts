import type { EngineInterface, Register } from 'claude-code'

import fullWindows from './fullWindows'
import isPlan from './isPlan'
import LIMITS_FILE from './LIMITS_FILE'
import limitsFile from './limitsFile'
import SWITCH from './SWITCH'
import SWITCH_TEXT from './SWITCH_TEXT'
import type { ArmedPlan, Handoff, Plan, RateLimit, SwitchState } from './types'

// Every helper that gets `$` lives in this file: `claude plugin validate`
// follows `$` past an import only into function declarations, which the
// repository's lint rules forbid.

const hasTarget = (plan: Plan): plan is ArmedPlan => plan.target !== null

// The config dir of the account this session runs on: CLAUDE_CONFIG_DIR as
// ccprofile set it, else ~/.claude (the first account of the default
// profile). USERPROFILE before HOME, as Node's os.homedir() on Windows.
const configDir = async ($: EngineInterface): Promise<string | undefined> => {
  const dir = await $.env.get('CLAUDE_CONFIG_DIR')
  if (dir !== undefined && dir !== '') return dir
  const home =
    (await $.env.get('USERPROFILE')) || (await $.env.get('HOME')) || undefined
  return home === undefined ? undefined : `${home}/${LIMITS_FILE.claudeDirName}`
}

// Records the windows of one measurement in the account's own config dir,
// where `ccprofile resolve` reads them to pick the next session's account.
// Writes on every measurement (not only when they moved), so a file left
// half written is replaced on the next turn. A failed write is dropped:
// ccprofile treats a missing file as no data.
const recordLimits = async (
  $: EngineInterface,
  rateLimits: readonly RateLimit[]
): Promise<void> => {
  try {
    const dir = await configDir($)
    if (dir === undefined) return
    await $.fs.write(
      `${dir}/${LIMITS_FILE.dirName}/${LIMITS_FILE.fileName}`,
      JSON.stringify(limitsFile(await $.clock.now(), rateLimits))
    )
  } catch {
    // Nothing to do.
  }
}

// Why this session cannot switch, undefined when it can: only a claude the
// hook v4 started (it hands over CCPROFILE_HANDOFF and resumes after /exit),
// and not one nested in another session (CLAUDECODE, set by Claude Code in
// its children), which would jump away from the session it runs in.
const switchBlock = async ($: EngineInterface): Promise<string | undefined> => {
  if (await $.env.get('CLAUDECODE')) return SWITCH_TEXT.nested
  if (!(await $.env.get('CCPROFILE_HANDOFF'))) return SWITCH_TEXT.noHook
  return undefined
}

// Asks ccprofile where the running session would continue; `error` is its
// own message (`ccprofile: …`), undefined when it is missing, fails
// silently or answers in another format.
const readPlan = async (
  $: EngineInterface
): Promise<Plan | { error: string | undefined }> => {
  try {
    const { exitCode, stdout, stderr } = await $.process.run(SWITCH.planArgv, {
      timeoutMs: SWITCH.planTimeoutMs,
    })
    if (exitCode !== 0) {
      const error = stderr.trim()
      return {
        error: error.startsWith(SWITCH.cliPrefix)
          ? error.slice(SWITCH.cliPrefix.length)
          : error || undefined,
      }
    }
    const plan: unknown = JSON.parse(stdout)
    return isPlan(plan) ? plan : { error: undefined }
  } catch {
    return { error: undefined }
  }
}

// A toast once per window, when a window reaches the threshold and another
// account is free. ccprofile names the threshold (asked until it answers)
// and, while a full window has not been offered, the target; a window counts
// as offered once a toast named it, so a target that frees up later still
// gets its toast.
const offerSwitch = async (
  $: EngineInterface,
  state: SwitchState,
  rateLimits: readonly RateLimit[]
): Promise<void> => {
  if (state.armed !== undefined || (await switchBlock($)) !== undefined) return
  if (state.threshold === undefined) {
    const plan = await readPlan($)
    if ('error' in plan) return
    state.threshold = plan.threshold
  }

  const fresh = fullWindows(
    rateLimits,
    state.threshold,
    await $.clock.now()
  ).filter(({ kind, resetsAt }) => !state.offered.has(`${kind}@${resetsAt}`))
  const [first] = fresh
  if (first === undefined) return

  const plan = await readPlan($)
  if ('error' in plan || !hasTarget(plan)) return
  for (const { kind, resetsAt } of fresh) {
    state.offered.add(`${kind}@${resetsAt}`)
  }
  $.ui.toast(SWITCH_TEXT.offer(first.kind, first.percentUsed, plan.target))
}

// `/ccprofile-switch` arms the switch to the account ccprofile names now,
// replacing an earlier one (a run that finds no target leaves none armed);
// `/ccprofile-switch off` drops it.
const runSwitchCommand = async (
  $: EngineInterface,
  state: SwitchState,
  args: string
): Promise<string> => {
  const wasArmed = state.armed !== undefined
  state.armed = undefined
  if (args.trim() === SWITCH.offArgument) {
    return wasArmed ? SWITCH_TEXT.cancelled : SWITCH_TEXT.notArmed
  }

  const blocked = await switchBlock($)
  if (blocked !== undefined) return blocked
  const plan = await readPlan($)
  if ('error' in plan) return plan.error ?? SWITCH_TEXT.planFailed
  if (!hasTarget(plan)) return SWITCH_TEXT.noTarget(plan.reason ?? '')
  state.armed = plan
  return SWITCH_TEXT.armed(plan.target, plan.profile)
}

// The handoff for the hook, written only for an armed switch ended by the
// person (/exit, ctrl+c, ctrl+d): the hook runs next. A failed write leaves
// nothing to resume, and the session ends as it would have.
const writeHandoff = async (
  $: EngineInterface,
  plan: ArmedPlan,
  sessionId: string
): Promise<void> => {
  try {
    const path = await $.env.get('CCPROFILE_HANDOFF')
    if (!path) return
    const handoff: Handoff = {
      version: SWITCH.handoffVersion,
      profile: plan.profile,
      account: plan.target,
      sessionId,
    }
    await $.fs.write(path, JSON.stringify(handoff))
  } catch {
    // Nothing to do.
  }
}

// Records the rate limits of every measurement for `ccprofile resolve`, and
// switches the session to another account of the profile: the person arms
// it with /ccprofile-switch, the mod writes the handoff at /exit, and the
// hook v4 resumes the session there. Observes only: nothing it does fails a
// measurement or the end of the session.
const register: Register = on => {
  const state: SwitchState = {
    armed: undefined,
    threshold: undefined,
    offered: new Set(),
  }

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: SWITCH.commandName,
      description: SWITCH_TEXT.description,
      argumentHint: SWITCH_TEXT.argumentHint,
    })
    return next(e)
  })

  on('command.run', { command: SWITCH.commandName }, async ($, e) => ({
    text: await runSwitchCommand($, state, e.args),
  }))

  on('session.measure', async ($, e, next) => {
    const result = await next(e)
    if (e.rateLimits.length === 0) return result

    await recordLimits($, e.rateLimits)
    try {
      await offerSwitch($, state, e.rateLimits)
    } catch {
      // A toast is a convenience; /ccprofile-switch still works.
    }
    return result
  })

  // Before the engine's end step, so the handoff is on disk when claude
  // exits and the hook looks. Any other end (/clear, /resume, logout, a
  // signal) drops the switch.
  on('session.end', async ($, e, next) => {
    const plan = state.armed
    state.armed = undefined
    if (plan !== undefined && e.reason === SWITCH.interactiveExit) {
      await writeHandoff($, plan, e.resume.id)
    }
    return next(e)
  })
}

// The engine loads the named export `register`.
// eslint-disable-next-line no-restricted-syntax
export { register }
