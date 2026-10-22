import { realpath } from 'node:fs/promises'

import type { ResolvedConfig } from '../../config/types'
import { MATCH_VIA } from '../../constants'
import type { Context } from '../../context/types'
import {
  matchPath,
  matchRemote,
  normalizeRemote,
  readOriginUrl,
} from '../../match'
import type { ProfileMatch } from '../types'

const realpathOrNull = async (path: string): Promise<string | null> => {
  try {
    return await realpath(path)
  } catch {
    return null
  }
}

// Profiles in array order, first match wins; `paths` and `remotes` of one
// profile are alternatives (spec §6). The origin is read lazily, at most once.
const findProfile = async (
  config: ResolvedConfig,
  ctx: Context
): Promise<ProfileMatch | null> => {
  const realCwd = (await realpathOrNull(ctx.cwd)) ?? ctx.cwd
  let origin: Promise<string | null> | undefined
  const getOrigin = () => {
    origin ??= readOriginUrl(ctx).then(url =>
      url === null ? null : normalizeRemote(url)
    )
    return origin
  }

  for (const profile of config.profiles) {
    for (const entry of profile.paths) {
      const realEntry = await realpathOrNull(entry)
      if (realEntry !== null && matchPath(realCwd, realEntry, ctx.platform)) {
        return { profile, via: MATCH_VIA.path, entry }
      }
    }

    if (profile.remotes.length === 0) continue
    const remote = await getOrigin()
    const entry =
      remote === null
        ? undefined
        : profile.remotes.find(candidate => matchRemote(remote, candidate))
    if (entry !== undefined) return { profile, via: MATCH_VIA.remote, entry }
  }

  return null
}

export default findProfile
