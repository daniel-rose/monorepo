import formatIssues from '../../config/formatIssues'
import resolveConfig from '../../config/resolveConfig'
import configSchema from '../../config/schema'
import { CONFIG_FILE } from '../../constants'
import type { Context } from '../../context/types'

// The checks `loadConfig` applies to a parsed file; returns the issues.
const validateConfig = async (
  config: unknown,
  ctx: Context
): Promise<string[]> => {
  const parsed = configSchema.safeParse(config)
  if (!parsed.success) {
    return formatIssues(parsed.error, CONFIG_FILE.fileName)
  }
  return (await resolveConfig(parsed.data, ctx)).issues
}

export default validateConfig
