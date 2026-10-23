import type { ResolvedProfile } from '../../../config'
import { CHECK_STATUS, DOCTOR_TEXT } from '../../../constants'
import { matchPath, matchRemote } from '../../../match'
import type { Check, CheckResult } from '../../types'

type Kind = 'path' | 'remote'

// For each entry of `profile`, the first earlier profile whose entry of the
// same kind covers it (equal, or a segment prefix) and therefore always wins.
const findShadowed = (
  kind: Kind,
  profiles: readonly ResolvedProfile[],
  covers: (earlierEntry: string, entry: string) => boolean
): CheckResult[] =>
  profiles.flatMap((profile, index) => {
    const entries = kind === 'path' ? profile.paths : profile.remotes
    return entries.flatMap(entry => {
      for (const earlier of profiles.slice(0, index)) {
        const candidates = kind === 'path' ? earlier.paths : earlier.remotes
        const winner = candidates.find(candidate => covers(candidate, entry))
        if (winner !== undefined) {
          return [
            {
              status: CHECK_STATUS.warn,
              message: DOCTOR_TEXT.shadowed(
                kind,
                profile.name,
                entry,
                earlier.name,
                winner
              ),
            },
          ]
        }
      }
      return []
    })
  })

const checkShadowedSelectors: Check = (ctx, config) => {
  if (config === null) return Promise.resolve([])

  const shadowed = [
    ...findShadowed('remote', config.profiles, (earlier, entry) =>
      matchRemote(entry, earlier)
    ),
    ...findShadowed('path', config.profiles, (earlier, entry) =>
      matchPath(entry, earlier, ctx.platform)
    ),
  ]

  return Promise.resolve(
    shadowed.length > 0
      ? shadowed
      : [{ status: CHECK_STATUS.ok, message: DOCTOR_TEXT.shadowedOk }]
  )
}

export default checkShadowedSelectors
