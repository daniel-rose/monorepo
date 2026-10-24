import { CONFIG_FILE } from '../../constants'
import type { Context } from '../../context/types'
import pathFlavor from '../pathFlavor'
import type { ResolvedProfile } from '../types'

// The Codex home that holds the shared Codex config of a profile: its
// codex.home, or ~/.codex.
const codexSource = (
  profile: ResolvedProfile,
  ctx: Pick<Context, 'homedir' | 'platform'>
): string =>
  profile.codexHome ??
  pathFlavor(ctx.platform).resolve(ctx.homedir, CONFIG_FILE.codexDirName)

export default codexSource
