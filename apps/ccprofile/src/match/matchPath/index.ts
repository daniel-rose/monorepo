import isSegmentPrefix from '../isSegmentPrefix'

const CASE_INSENSITIVE_PLATFORMS: readonly NodeJS.Platform[] = [
  'win32',
  'darwin',
]

const matchPath = (
  realCwd: string,
  realEntry: string,
  platform: NodeJS.Platform
): boolean =>
  isSegmentPrefix(realEntry, realCwd, {
    separator: platform === 'win32' ? '\\' : '/',
    caseInsensitive: CASE_INSENSITIVE_PLATFORMS.includes(platform),
  })

export default matchPath
