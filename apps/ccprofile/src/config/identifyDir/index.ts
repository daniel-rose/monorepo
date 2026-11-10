import { realpath, stat } from 'node:fs/promises'

import foldPath from '../foldPath'
import type { DirIdentity } from '../types'

// Keys that identify a directory: its resolved path plus, when it exists,
// the real path behind symlinks, both folded (`foldPath`). Two directories
// are the same when a key is shared.
const identifyDir = async (
  resolved: string,
  platform: NodeJS.Platform
): Promise<DirIdentity> => {
  const fold = (value: string) => foldPath(value, platform)
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
