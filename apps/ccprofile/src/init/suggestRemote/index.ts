import type { Context } from '../../context/types'
import { normalizeRemote, readOriginUrl } from '../../match'

// `host/<first path segment>` of the current repo's origin, if there is one.
const suggestRemote = async (ctx: Context): Promise<string | undefined> => {
  const origin = await readOriginUrl(ctx)
  const normalized = origin === null ? null : normalizeRemote(origin)
  if (normalized === null) return undefined

  const [host, namespace] = normalized.split('/')
  return namespace === undefined ? host : `${host}/${namespace}`
}

export default suggestRemote
