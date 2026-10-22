// Not a hostful remote: helper protocols (`codecommit::…`), relative or
// absolute paths, UNC and drive-letter paths, `file:` URLs.
const NON_HOST_PATTERN = /^(?:[A-Za-z][\w+.-]*::|[/.\\]|[A-Za-z]:[/\\]|file:)/i
// Host of a bare `host/path` entry: no port or scheme colon, no whitespace.
const BARE_HOST_PATTERN = /^[^\s:]+$/
// `scheme://[user@]host[:port][/path]`
const URL_PATTERN =
  /^[A-Za-z][A-Za-z0-9+.-]*:\/\/(?:[^@/]*@)?(\[[^\]]+\]|[^/:@]+)(?::\d+)?(?:\/(.*))?$/
// `[user@]host:path` (no `//`)
const SCP_PATTERN = /^(?:[^@/:]+@)?([^/:@]+):(?!\/\/)(.+)$/

const cleanPath = (path: string): string =>
  path
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\.git$/, '')
    .replace(/\/+$/, '')

const join = (host: string, path: string): string | null => {
  if (host === '') return null
  const cleaned = cleanPath(path)
  return cleaned === ''
    ? host.toLowerCase()
    : `${host.toLowerCase()}/${cleaned}`
}

// Normalizes remote URLs and bare config entries to `host/path`.
// Returns null for remotes without a host.
const normalizeRemote = (url: string): string | null => {
  const value = url.trim()
  if (value === '' || NON_HOST_PATTERN.test(value)) return null

  const urlMatch = URL_PATTERN.exec(value)
  if (urlMatch) return join(urlMatch[1], urlMatch[2] ?? '')

  const scpMatch = SCP_PATTERN.exec(value)
  if (scpMatch) return join(scpMatch[1], scpMatch[2])

  const [host, ...rest] = value.split('/')
  return BARE_HOST_PATTERN.test(host) ? join(host, rest.join('/')) : null
}

export default normalizeRemote
