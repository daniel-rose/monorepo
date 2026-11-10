import { CODEX_MODE, CONFIG_FILE } from '../../constants'
import type { Context } from '../../context/types'
import pathFlavor from '../pathFlavor'
import type { ResolvedProfile } from '../types'

// The Codex home that holds the shared Codex config of a profile: its
// codex.home, or ~/.codex; null when the profile disables codex.
const codexSource = (
  { codex }: ResolvedProfile,
  ctx: Pick<Context, 'homedir' | 'platform'>
): string | null => {
  switch (codex.mode) {
    case CODEX_MODE.disabled:
      return null
    case CODEX_MODE.home:
      return codex.home
    case CODEX_MODE.default:
      return pathFlavor(ctx.platform).resolve(
        ctx.homedir,
        CONFIG_FILE.codexDirName
      )
  }
}

export default codexSource
