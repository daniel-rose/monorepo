import { LIMITS_STATUS } from '../../constants'
import type { Assessment, FullWindow, LimitsReading } from '../types'

// Whether an account is full: any window at or above the threshold that has
// not reset yet. A window whose reset has passed counts as 0 %; one without
// a reset is ignored (a skipped account is never measured again, so it would
// stay full forever). No data is never full.
const assessLimits = (
  reading: LimitsReading,
  threshold: number,
  now: number
): Assessment => {
  if (reading.status !== LIMITS_STATUS.ok) return { isFull: false }

  const windows = reading.windows.flatMap(
    ({ kind, percentUsed, resetsAt }): FullWindow[] =>
      resetsAt !== undefined && resetsAt > now && percentUsed >= threshold
        ? [{ kind, percentUsed, resetsAt }]
        : []
  )
  if (windows.length === 0) return { isFull: false }
  return {
    isFull: true,
    windows,
    freeAt: Math.max(...windows.map(({ resetsAt }) => resetsAt)),
  }
}

export default assessLimits
