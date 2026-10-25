import { LIMITS_TEXT } from '../../constants'
import formatResetTime from '../formatResetTime'
import type { SkippedAccount } from '../types'

// `private five_hour 97% until 14:30; seat-2 seven_day 92% until Mon 09:00`
const formatSkipped = (
  skipped: readonly SkippedAccount[],
  now: number
): string =>
  skipped
    .map(({ name, windows, freeAt }) =>
      LIMITS_TEXT.skipped(
        name,
        windows.map(({ kind, percentUsed }) =>
          LIMITS_TEXT.window(kind, percentUsed)
        ),
        formatResetTime(freeAt, now)
      )
    )
    .join(LIMITS_TEXT.skippedSeparator)

export default formatSkipped
