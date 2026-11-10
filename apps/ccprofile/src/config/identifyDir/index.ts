import { realpath, stat } from 'node:fs/promises'

import type { DirIdentity } from '../types'

const CASE_INSENSITIVE_PLATFORMS: readonly NodeJS.Platform[] = [
  'win32',
  'darwin',
]

// Keys that identify a directory: its resolved path plus, when it exists,
// the real path behind symlinks; case-folded where the filesystem usually
// is case-insensitive. Two directories are the same when a key is shared.
const identifyDir = async (
  resolved: string,
  platform: NodeJS.Platform
): Promise<DirIdentity> => {
  const fold = (value: string) =>
    CASE_INSENSITIVE_PLATFORMS.includes(platform) ? value.toLowerCase() : value
  try {
    if (!(await stat(resolved)).isDirectory()) {
      return { keys: [fold(resolved)], isFile: true }
    }
    return {
      keys: [fold(resolved), fold(await realpath(resolved))],
      isFile: false,
    }
  } catch {
    return { keys: [fold(resolved)], isFile: false }
  }
}

export default identifyDir
