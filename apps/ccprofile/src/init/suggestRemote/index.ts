import type { Context } from '../../context/types'
import { normalizeRemote, readOriginUrl } from '../../match'

// The normalized origin without its last segment (`host/group/sub/app` ->
// `host/group/sub`), if there is one.
const suggestRemote = async (ctx: Context): Promise<string | undefined> => {
  const origin = await readOriginUrl(ctx)
  const normalized = origin === null ? null : normalizeRemote(origin)
  if (normalized === null) return undefined

  const segments = normalized.split('/').slice(0, -1)
  return segments.length === 0 ? undefined : segments.join('/')
}

export default suggestRemote
