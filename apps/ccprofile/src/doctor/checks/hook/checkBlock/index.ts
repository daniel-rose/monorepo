import type { Shell } from '../../../../constants'
import {
  CHECK_STATUS,
  DOCTOR_TEXT,
  MARKER_UPDATE_STATUS,
} from '../../../../constants'
import { buildBlock, readText, updateMarkerBlock } from '../../../../setup'
import type { CheckResult } from '../../../types'

const warn = (message: string): CheckResult => ({
  status: CHECK_STATUS.warn,
  message,
})

// Read-only: is the ccprofile block in this startup file, and is it the one
// `setup` would write? (The same comparison `setup` uses to find nothing to do.)
const checkBlock = async (
  shell: Shell,
  file: string,
  hookFile: string,
  options: { requireFile: boolean }
): Promise<CheckResult | null> => {
  let text: string | null
  try {
    text = await readText(file)
  } catch {
    return warn(DOCTOR_TEXT.startupFileUnreadable(file))
  }
  if (text === null) {
    return options.requireFile
      ? warn(DOCTOR_TEXT.startupFileMissing(file))
      : null
  }

  const removal = updateMarkerBlock(text, null)
  if (removal.status === MARKER_UPDATE_STATUS.malformed) {
    return warn(DOCTOR_TEXT.blockMalformed(file, removal.reason))
  }
  // Removing something that is not there changes nothing.
  if (removal.status === MARKER_UPDATE_STATUS.unchanged) {
    return warn(DOCTOR_TEXT.blockMissing(file))
  }

  const expected = updateMarkerBlock(text, buildBlock(shell, hookFile))
  return expected.status === MARKER_UPDATE_STATUS.unchanged
    ? { status: CHECK_STATUS.ok, message: DOCTOR_TEXT.blockOk(file) }
    : warn(DOCTOR_TEXT.blockDiffers(file))
}

export default checkBlock
