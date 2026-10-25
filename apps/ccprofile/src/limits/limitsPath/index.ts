import pathFlavor from '../../config/pathFlavor'
import { CONFIG_FILE, LIMITS } from '../../constants'
import type { Context } from '../../context/types'

// Where the mod of an account writes: its configDir, or ~/.claude for the
// first account of the default profile (the mod has no CLAUDE_CONFIG_DIR
// there and falls back to the home directory as well).
const limitsPath = (
  configDir: string | undefined,
  ctx: Pick<Context, 'homedir' | 'platform'>
): string => {
  const flavor = pathFlavor(ctx.platform)
  const dir =
    configDir ?? flavor.resolve(ctx.homedir, CONFIG_FILE.claudeDirName)
  return flavor.join(dir, LIMITS.dirName, LIMITS.fileName)
}

export default limitsPath
