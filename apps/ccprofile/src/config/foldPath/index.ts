const CASE_INSENSITIVE_PLATFORMS: readonly NodeJS.Platform[] = [
  'win32',
  'darwin',
]

// A path as compared for sameness: lower-cased where the filesystem usually
// is case-insensitive.
const foldPath = (path: string, platform: NodeJS.Platform): string =>
  CASE_INSENSITIVE_PLATFORMS.includes(platform) ? path.toLowerCase() : path

export default foldPath
