import { CONFIG_FILE, ENV_VAR } from '../../constants'
import type { Context } from '../../context/types'
import pathFlavor from '../pathFlavor'
import readEnv from '../readEnv'

// The base directory ccprofile's own files live under (`<home>/ccprofile/…`):
// %APPDATA% on Windows, $XDG_CONFIG_HOME or ~/.config elsewhere.
const locateConfigHome = (ctx: Context): string => {
  const flavor = pathFlavor(ctx.platform)

  if (ctx.platform === 'win32') {
    return (
      readEnv(ctx, ENV_VAR.appData) ??
      flavor.join(ctx.homedir, ...CONFIG_FILE.windowsRoamingDirNames)
    )
  }

  return (
    readEnv(ctx, ENV_VAR.xdgConfigHome) ??
    flavor.join(ctx.homedir, CONFIG_FILE.defaultXdgDirName)
  )
}

export default locateConfigHome
