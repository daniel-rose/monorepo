import { CONFIG_FILE } from '../../constants'
import type { Context } from '../../context/types'
import pathFlavor from '../pathFlavor'
import type { ResolvedProfile } from '../types'

// The directory that holds the shared config of a profile: its configDir,
// or ~/.claude for the default profile.
const sharedSource = (
  profile: ResolvedProfile,
  ctx: Pick<Context, 'homedir' | 'platform'>
): string =>
  profile.configDir ??
  pathFlavor(ctx.platform).resolve(ctx.homedir, CONFIG_FILE.claudeDirName)

export default sharedSource
