import type { Context } from '../../context/types'

// Empty strings count as unset.
const readEnv = (ctx: Context, name: string): string | undefined => {
  const value = ctx.env[name]
  return value === undefined || value === '' ? undefined : value
}

export default readEnv
