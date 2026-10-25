import { LIMITS_TEXT, SELECTION_KIND } from '../../constants'
import formatResetTime from '../formatResetTime'
import formatSkipped from '../formatSkipped'
import type { AccountSelection } from '../types'

// Why the limit data led away from the first account, for the stderr line
// of `resolve` and for `status`; undefined for every other selection.
const formatSelection = (
  selection: AccountSelection,
  now: number
): string | undefined => {
  switch (selection.kind) {
    case SELECTION_KIND.auto:
      return LIMITS_TEXT.autoDetail(
        selection.threshold,
        formatSkipped(selection.skipped, now)
      )
    case SELECTION_KIND.allFull:
      return LIMITS_TEXT.allFullDetail(
        selection.threshold,
        formatResetTime(selection.freeAt, now)
      )
    default:
      return undefined
  }
}

export default formatSelection
