import type { ResolvedConfig } from '../../config'
import { identifyDir } from '../../config'
import type { Context } from '../../context/types'
import type { Candidate } from '../../init'
import { findCandidates } from '../../init'

// The Claude config directories in the home that no profile or account
// uses yet: ~/.claude only while no profile omits configDir, a ~/.claude-*
// directory only when none of its identity keys is `taken`.
const freeCandidates = async (
  config: ResolvedConfig,
  taken: ReadonlySet<string>,
  ctx: Context
): Promise<Candidate[]> => {
  const hasDefault = config.profiles.some(
    profile => profile.configDir === undefined
  )
  const candidates = await findCandidates(ctx)
  const free = await Promise.all(
    candidates.map(async candidate => {
      if (candidate.configDir === undefined) return !hasDefault
      const { keys } = await identifyDir(candidate.configDir, ctx.platform)
      return !keys.some(key => taken.has(key))
    })
  )
  return candidates.filter((_candidate, index) => free[index])
}

export default freeCandidates
