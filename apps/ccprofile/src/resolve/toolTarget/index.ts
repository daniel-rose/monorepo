import { stat } from 'node:fs/promises'

import pathFlavor from '../../config/pathFlavor'
import sharedSource from '../../config/sharedSource'
import type { ResolvedProfile } from '../../config/types'
import type { Tool } from '../../constants'
import {
  CODEX_HOME_SOURCE,
  CONFIG_FILE,
  RESOLVE_MESSAGE,
  TOOL,
} from '../../constants'
import type { Context } from '../../context/types'
import selectCodexHome from '../selectCodexHome'
import type { SelectedAccount, ToolTarget } from '../types'

const exists = async (path: string): Promise<boolean> => {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

// claude: warns once if the configDir does not exist yet (claude creates
// it), passes the shared .mcp.json.
const claudeTarget = async (
  profile: ResolvedProfile,
  account: SelectedAccount,
  ctx: Context
): Promise<ToolTarget> => {
  const dir = account.configDir
  if (dir !== undefined && !(await exists(dir))) {
    ctx.stderr.write(
      account.name === profile.name
        ? RESOLVE_MESSAGE.creatingProfile(profile.name, dir)
        : RESOLVE_MESSAGE.creatingAccount(account.name, profile.name, dir)
    )
  }
  const mcpPath = pathFlavor(ctx.platform).join(
    sharedSource(profile, ctx),
    CONFIG_FILE.mcpConfigName
  )
  return {
    tool: TOOL.claude,
    mcpConfig: (await exists(mcpPath)) ? mcpPath : undefined,
  }
}

// codex: the CODEX_HOME, with a hint when it is missing (codex refuses to
// start without it, `link` creates it).
const codexTarget = async (
  profile: ResolvedProfile,
  account: SelectedAccount,
  ctx: Context
): Promise<ToolTarget> => {
  const codexHome = selectCodexHome(profile, account.name)
  if (
    codexHome.source !== CODEX_HOME_SOURCE.default &&
    !(await exists(codexHome.dir))
  ) {
    ctx.stderr.write(
      RESOLVE_MESSAGE.codexHomeMissing(codexHome.dir, account.name)
    )
  }
  return { tool: TOOL.codex, codexHome }
}

type Selection = {
  tool: Tool
  profile: ResolvedProfile
  account: SelectedAccount
}

// What the selected account needs to start its tool.
const toolTarget = (
  { tool, profile, account }: Selection,
  ctx: Context
): Promise<ToolTarget> =>
  tool === TOOL.codex
    ? codexTarget(profile, account, ctx)
    : claudeTarget(profile, account, ctx)

export default toolTarget
