import { locateConfigHome } from '../../config'
import pathFlavor from '../../config/pathFlavor'
import type { Shell } from '../../constants'
import { CONFIG_FILE, HOOK_FILE, HOOK_FILE_EXTENSION } from '../../constants'
import type { Context } from '../../context/types'

// `<config home>/ccprofile/hook.<ext>`. CCPROFILE_CONFIG does not move it: that
// override names a config file, not a directory.
const hookFilePath = (shell: Shell, ctx: Context): string =>
  pathFlavor(ctx.platform).join(
    locateConfigHome(ctx),
    CONFIG_FILE.appDirName,
    `${HOOK_FILE.installedBaseName}.${HOOK_FILE_EXTENSION[shell]}`
  )

export default hookFilePath
