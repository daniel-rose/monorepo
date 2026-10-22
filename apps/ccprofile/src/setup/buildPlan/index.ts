import { readFile } from 'node:fs/promises'

import type { Shell } from '../../constants'
import {
  CONFIG_FILE,
  MARKER,
  MARKER_UPDATE_STATUS,
  SETUP_TEXT,
} from '../../constants'
import type { Context } from '../../context/types'
import hookFilePath from '../hookFilePath'
import sourceLine from '../sourceLine'
import type { FileChange, IntegrationTarget, Plan, SetupMode } from '../types'
import updateMarkerBlock from '../updateMarkerBlock'

const errorCode = (error: unknown): string =>
  error instanceof Error && 'code' in error ? String(error.code) : 'error'

// null: the file does not exist. A byte order mark is not part of the text
// (writeFileAtomic puts it back).
const readText = async (file: string): Promise<string | null> => {
  try {
    const text = await readFile(file, 'utf8')
    return text.startsWith(CONFIG_FILE.byteOrderMark)
      ? text.slice(CONFIG_FILE.byteOrderMark.length)
      : text
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return null
    throw new Error(SETUP_TEXT.cannotAccess(file, errorCode(error)), {
      cause: error,
    })
  }
}

const isChange = (change: FileChange): boolean => change.before !== change.after

const buildBlock = (shell: Shell, hookFile: string): string =>
  [MARKER.start, sourceLine(shell, hookFile), MARKER.end].join('\n')

// Works out every file `setup` would touch, without touching any. Fails (and so
// writes nothing at all) if the startup file has a broken marker block.
const buildPlan = async (
  shell: Shell,
  target: IntegrationTarget,
  mode: SetupMode,
  hook: string,
  ctx: Context
): Promise<Plan> => {
  const install = mode === 'install'

  // fish: the conf.d file is the hook, there is no separate hook file.
  if (target.kind === 'file') {
    const before = await readText(target.file)
    const change = {
      file: target.file,
      before,
      after: install ? hook : null,
      showDiff: false,
    }
    return { ok: true, changes: [change].filter(isChange) }
  }

  const hookFile = hookFilePath(shell, ctx)
  const rcBefore = await readText(target.file)
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

  const hookBefore = await readText(hookFile)
  const changes: FileChange[] = [
    {
      file: hookFile,
      before: hookBefore,
      after: install ? hook : null,
      showDiff: false,
    },
    {
      file: target.file,
      before: rcBefore,
      // Removing from a file that does not exist stays a no-op.
      after: rcBefore === null && !install ? null : update.content,
      showDiff: true,
    },
  ]
  return { ok: true, changes: changes.filter(isChange) }
}

export default buildPlan
