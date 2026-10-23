import { CONFIG_FILE, ENV_VAR } from '../../constants'
import type { Context } from '../../context/types'
import locateConfigHome from '../locateConfigHome'
import pathFlavor from '../pathFlavor'
import readEnv from '../readEnv'

const locateConfig = (ctx: Context): string => {
  const explicit = readEnv(ctx, ENV_VAR.config)
  if (explicit !== undefined) return explicit

  return pathFlavor(ctx.platform).join(
    locateConfigHome(ctx),
    CONFIG_FILE.appDirName,
    CONFIG_FILE.fileName
  )
}

export default locateConfig
