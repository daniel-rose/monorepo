import type { Context } from '../../context/types'

const readOriginUrl = async (ctx: Context): Promise<string | null> => {
  const result = await ctx.runCommand('git', ['remote', 'get-url', 'origin'], {
    cwd: ctx.cwd,
    env: ctx.env,
  })
  if (result.exitCode !== 0) return null

  const url = result.stdout.trim()
  return url === '' ? null : url
}

export default readOriginUrl
