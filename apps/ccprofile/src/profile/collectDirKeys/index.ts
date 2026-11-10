import expandHome from '../../config/expandHome'
import identifyDir from '../../config/identifyDir'
import pathFlavor from '../../config/pathFlavor'
import { CONFIG_FILE } from '../../constants'
import type { Context } from '../../context/types'

// The identity keys of the given directories plus ~/.claude and ~/.codex:
// everything a new configDir or codex.home must not be.
const collectDirKeys = async (
  dirs: readonly string[],
  ctx: Pick<Context, 'homedir' | 'platform'>
): Promise<Set<string>> => {
  const flavor = pathFlavor(ctx.platform)
  const all = [
    flavor.resolve(ctx.homedir, CONFIG_FILE.claudeDirName),
    flavor.resolve(ctx.homedir, CONFIG_FILE.codexDirName),
    ...dirs.map(dir => flavor.resolve(expandHome(dir, ctx.homedir))),
  ]
  const identities = await Promise.all(
    all.map(dir => identifyDir(dir, ctx.platform))
  )
  return new Set(identities.flatMap(({ keys }) => keys))
}

export default collectDirKeys
