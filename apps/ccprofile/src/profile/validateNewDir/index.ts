import expandHome from '../../config/expandHome'
import foldPath from '../../config/foldPath'
import pathFlavor from '../../config/pathFlavor'
import { CONFIG_PATTERN, PROFILE_WIZARD_TEXT } from '../../constants'
import type { Context } from '../../context/types'

// true for a directory a new profile may take, else the message for the
// prompt. `taken` holds folded keys (`collectDirKeys`); the comparison is by
// path here, symlinks are caught by the config check before writing.
const validateNewDir = (
  value: string,
  taken: ReadonlySet<string>,
  ctx: Pick<Context, 'homedir' | 'platform'>
): true | string => {
  if (!CONFIG_PATTERN.noLineControl.test(value)) {
    return PROFILE_WIZARD_TEXT.lineControl(value)
  }
  const flavor = pathFlavor(ctx.platform)
  const expanded = expandHome(value, ctx.homedir)
  if (!flavor.isAbsolute(expanded)) return PROFILE_WIZARD_TEXT.badDir(value)
  const key = foldPath(flavor.resolve(expanded), ctx.platform)
  return taken.has(key) ? PROFILE_WIZARD_TEXT.dirTaken(value) : true
}

export default validateNewDir
