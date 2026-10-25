import { loadConfig } from '../../config'
import type { ExitCode } from '../../constants'
import { CHECK_STATUS, EXIT_CODE, LOAD_STATUS } from '../../constants'
import type { Context } from '../../context/types'
import checkAccountLinks from '../checks/accountLinks'
import checkBashProfile from '../checks/bashProfile'
import checkClaudeOnPath from '../checks/claudeOnPath'
import checkCodexLogin from '../checks/codexLogin'
import checkConfig from '../checks/config'
import checkEnvOverride from '../checks/envOverride'
import checkHook from '../checks/hook'
import checkLimits from '../checks/limits'
import checkLogin from '../checks/login'
import checkMissingPaths from '../checks/missingPaths'
import checkSchemaMajor from '../checks/schemaMajor'
import checkShadowedSelectors from '../checks/shadowedSelectors'
import type { Check, CheckResult } from '../types'

// Output order: config, claude, claude logins, limit data, codex logins,
// links, hook, hygiene.
const CHECKS: readonly Check[] = [
  checkClaudeOnPath,
  checkLogin,
  checkLimits,
  checkCodexLogin,
  checkAccountLinks,
  checkHook,
  checkBashProfile,
  checkMissingPaths,
  checkShadowedSelectors,
  checkSchemaMajor,
  checkEnvOverride,
]

const STATUS_COLUMN_WIDTH = 6

const formatLine = ({ status, message }: CheckResult): string =>
  `${status.padEnd(STATUS_COLUMN_WIDTH)}${message}\n`

// `ccprofile doctor`: read-only checks, one `<status>  <message>` line each.
// The checks are independent and run at once; their lines keep CHECKS order.
const runDoctor = async (ctx: Context): Promise<ExitCode> => {
  const loaded = await loadConfig(ctx)
  const config = loaded.status === LOAD_STATUS.ok ? loaded.config : null

  const results = (
    await Promise.all([
      checkConfig(ctx, loaded),
      ...CHECKS.map(async check => check(ctx, config)),
    ])
  ).flat()

  ctx.stdout.write(results.map(formatLine).join(''))
  return results.some(result => result.status === CHECK_STATUS.fail)
    ? EXIT_CODE.failure
    : EXIT_CODE.ok
}

export default runDoctor
