import isSegmentPrefix from '../isSegmentPrefix'

const matchRemote = (normalizedUrl: string, normalizedEntry: string): boolean =>
  isSegmentPrefix(normalizedEntry, normalizedUrl, {
    separator: '/',
    caseInsensitive: true,
  })

export default matchRemote
