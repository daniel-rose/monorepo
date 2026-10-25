import { LIMITS_STATUS, LIMITS_TEXT } from '../../constants'
import type { LimitsReading } from '../types'

// The last reading of an account for `list`: `5h 42% · 7d 80%`, a passed
// window as `5h reset`, or why there is no data.
const formatReading = (reading: LimitsReading, now: number): string => {
  switch (reading.status) {
    case LIMITS_STATUS.missing:
      return LIMITS_TEXT.noData
    case LIMITS_STATUS.invalid:
      return LIMITS_TEXT.invalid
    case LIMITS_STATUS.unsupported:
      return LIMITS_TEXT.unsupported(reading.version)
    case LIMITS_STATUS.ok:
      return reading.windows.length === 0
        ? LIMITS_TEXT.noData
        : reading.windows
            .map(({ kind, percentUsed, resetsAt }) => {
              const short = LIMITS_TEXT.shortKinds[kind] ?? kind
              return resetsAt !== undefined && resetsAt <= now
                ? LIMITS_TEXT.listWindowReset(short)
                : LIMITS_TEXT.window(short, percentUsed)
            })
            .join(LIMITS_TEXT.listSeparator)
  }
}

export default formatReading
