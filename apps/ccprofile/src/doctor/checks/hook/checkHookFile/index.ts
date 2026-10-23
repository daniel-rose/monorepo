import {
  CHECK_STATUS,
  DOCTOR_PATTERN,
  DOCTOR_TEXT,
  HOOK_VERSION,
} from '../../../../constants'
import { readText } from '../../../../setup'
import type { CheckResult } from '../../../types'

const DECIMAL = 10

const warn = (message: string): CheckResult => ({
  status: CHECK_STATUS.warn,
  message,
})

// A hook file (or fish's conf.d file, which is the hook itself) must exist and
// carry the current version marker.
const checkHookFile = async (
  label: string,
  file: string
): Promise<CheckResult> => {
  let text: string | null
  try {
    text = await readText(file)
  } catch {
    return warn(DOCTOR_TEXT.hookFileUnreadable(label, file))
  }
  if (text === null) return warn(DOCTOR_TEXT.hookFileMissing(label, file))

  const marker = DOCTOR_PATTERN.hookVersion.exec(text)?.[1]
  const found =
    marker === undefined ? undefined : Number.parseInt(marker, DECIMAL)
  if (found !== HOOK_VERSION) {
    return warn(DOCTOR_TEXT.hookFileOutdated(label, file, found, HOOK_VERSION))
  }
  return {
    status: CHECK_STATUS.ok,
    message: DOCTOR_TEXT.hookFileOk(label, file, found),
  }
}

export default checkHookFile
