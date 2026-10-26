import { expandHome } from '../../config'
import pathFlavor from '../../config/pathFlavor'
import { INIT_PATTERN, INIT_TEXT } from '../../constants'
import type { Context } from '../../context/types'
import { normalizeRemote } from '../../match'
import splitMatchers from '../splitMatchers'

// true when every entry is an absolute path or a git remote (and there is
// one, if `required`), else the message for the first unusable entry.
const validateMatchers = (
  answer: string,
  required: boolean,
  ctx: Context
): true | string => {
  const entries = splitMatchers(answer)
  if (entries.length === 0) return required ? INIT_TEXT.matcherRequired : true

  const flavor = pathFlavor(ctx.platform)
  for (const entry of entries) {
    if (INIT_PATTERN.pathEntry.test(entry)) {
      if (!flavor.isAbsolute(expandHome(entry, ctx.homedir))) {
        return INIT_TEXT.badPath(entry)
      }
    } else if (normalizeRemote(entry) === null) {
      return INIT_TEXT.badRemote(entry)
    }
  }
  return true
}

export default validateMatchers
