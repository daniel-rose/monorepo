import { CONFIG_FILE, ENV_VAR } from '../../constants'
import type { Context } from '../../context/types'
import pathFlavor from '../pathFlavor'

// Empty strings count as unset.
const readEnv = (ctx: Context, name: string): string | undefined => {
  const value = ctx.env[name]
  return value === undefined || value === '' ? undefined : value
}

const locateConfig = (ctx: Context): string => {
  const explicit = readEnv(ctx, ENV_VAR.config)
  if (explicit !== undefined) return explicit

  const flavor = pathFlavor(ctx.platform)
  const { appDirName, fileName } = CONFIG_FILE

  if (ctx.platform === 'win32') {
    const appData =
      readEnv(ctx, ENV_VAR.appData) ??
      flavor.join(ctx.homedir, ...CONFIG_FILE.windowsRoamingDirNames)
    return flavor.join(appData, appDirName, fileName)
  }

  const configHome =
    readEnv(ctx, ENV_VAR.xdgConfigHome) ??
    flavor.join(ctx.homedir, CONFIG_FILE.defaultXdgDirName)
  return flavor.join(configHome, appDirName, fileName)
}

export default locateConfig
