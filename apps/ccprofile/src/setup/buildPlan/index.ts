import type { Shell } from '../../constants'
import {
  MARKER_UPDATE_STATUS,
  SETUP_MODE,
  SETUP_TEXT,
  SHELL,
  TARGET_KIND,
} from '../../constants'
import type { Context } from '../../context/types'
import buildBlock from '../buildBlock'
import hookFilePath from '../hookFilePath'
import otherPowerShellUsingHook from '../otherPowerShellUsingHook'
import readText from '../readText'
import type { FileChange, IntegrationTarget, Plan, SetupMode } from '../types'
import updateMarkerBlock from '../updateMarkerBlock'

const NON_ASCII = /[^\0-\x7f]/
const POWERSHELLS: readonly Shell[] = [SHELL.pwsh, SHELL.powershell]

const isChange = (change: FileChange): boolean => change.before !== change.after

// Windows PowerShell 5.1 reads a file without a byte order mark as ANSI, so a
// new file, or one with non-ASCII text (a user name in the hook path), needs one.
const needsBom = (
  shell: Shell,
  before: string | null,
  after: string | null
): boolean =>
  POWERSHELLS.includes(shell) &&
  after !== null &&
  (before === null || NON_ASCII.test(after))

// Works out every file `setup` would touch, without touching any. Fails (and so
// writes nothing at all) if a startup file is not UTF-8 or has a broken marker
// block.
const buildPlan = async (
  shell: Shell,
  target: IntegrationTarget,
  mode: SetupMode,
  hook: string,
  ctx: Context
): Promise<Plan> => {
  const install = mode === SETUP_MODE.install

  // fish: the conf.d file is the hook, there is no separate hook file.
  if (target.kind === TARGET_KIND.file) {
    const before = await readText(target.file, { lenient: true })
    const after = install ? hook : null
    const change = {
      file: target.file,
      before,
      after,
      showDiff: false,
      bom: needsBom(shell, before, after),
      owned: true,
    }
    return { ok: true, changes: [change].filter(isChange), notes: [] }
  }

  const hookFile = hookFilePath(shell, ctx)
  const rcBefore = await readText(target.file)
  // The hook file is ccprofile's own: always overwritten (spec §9).
  const hookBefore = await readText(hookFile, { lenient: true })
  const update = updateMarkerBlock(
    rcBefore ?? '',
    install ? buildBlock(shell, hookFile) : null
  )
  if (update.status === MARKER_UPDATE_STATUS.malformed) {
    return {
      ok: false,
      message: SETUP_TEXT.malformed(target.file, update.reason),
    }
  }

  // Removing from a file that does not exist stays a no-op.
  const rcAfter = rcBefore === null && !install ? null : update.content
  // Remove: the other PowerShell's profile may still source the shared hook.
  const keptFor = install
    ? null
    : await otherPowerShellUsingHook(shell, target.file, ctx)
  const hookOnRemove = keptFor === null ? null : hookBefore
  const hookAfter = install ? hook : hookOnRemove
  const changes: FileChange[] = [
    {
      file: hookFile,
      before: hookBefore,
      after: hookAfter,
      showDiff: false,
      bom: needsBom(shell, hookBefore, hookAfter),
      owned: true,
    },
    {
      file: target.file,
      before: rcBefore,
      after: rcAfter,
      showDiff: true,
      bom: needsBom(shell, rcBefore, rcAfter),
      owned: false,
    },
  ]
  return {
    ok: true,
    changes: changes.filter(isChange),
    notes:
      keptFor === null || hookBefore === null
        ? []
        : [SETUP_TEXT.keptHook(hookFile, keptFor)],
  }
}

export default buildPlan
