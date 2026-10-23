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
    const before = await readText(target.file)
    const after = install ? hook : null
    const change = {
      file: target.file,
      before,
      after,
      showDiff: false,
      bom: needsBom(shell, before, after),
    }
    return { ok: true, changes: [change].filter(isChange) }
  }

  const hookFile = hookFilePath(shell, ctx)
  const rcBefore = await readText(target.file)
  const hookBefore = await readText(hookFile)
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
  const hookAfter = install ? hook : null
  const changes: FileChange[] = [
    {
      file: hookFile,
      before: hookBefore,
      after: hookAfter,
      showDiff: false,
      bom: needsBom(shell, hookBefore, hookAfter),
    },
    {
      file: target.file,
      before: rcBefore,
      after: rcAfter,
      showDiff: true,
      bom: needsBom(shell, rcBefore, rcAfter),
    },
  ]
  return { ok: true, changes: changes.filter(isChange) }
}

export default buildPlan
