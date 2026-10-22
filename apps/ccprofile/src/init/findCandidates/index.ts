import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

import { CONFIG_FILE } from '../../constants'
import type { Context } from '../../context/types'
import type { Candidate } from '../types'

const exists = async (path: string): Promise<boolean> => {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

const DEFAULT_NAME = 'default'
const PREFIX = `${CONFIG_FILE.claudeDirName}-`
const STATE_FILE = `${CONFIG_FILE.claudeDirName}.json`

// Read-only: the default profile if ~/.claude.json or ~/.claude exists, plus
// every ~/.claude-* directory that holds a .claude.json.
const findCandidates = async (ctx: Context): Promise<Candidate[]> => {
  const { homedir } = ctx
  const candidates: Candidate[] = []

  if (
    (await exists(join(homedir, STATE_FILE))) ||
    (await exists(join(homedir, CONFIG_FILE.claudeDirName)))
  ) {
    candidates.push({ configDir: undefined, suggestedName: DEFAULT_NAME })
  }

  let entries: string[]
  try {
    entries = (await readdir(homedir)).sort()
  } catch {
    return candidates
  }

  for (const entry of entries) {
    if (!entry.startsWith(PREFIX) || entry.length === PREFIX.length) continue
    const configDir = join(homedir, entry)
    if (await exists(join(configDir, STATE_FILE))) {
      candidates.push({ configDir, suggestedName: entry.slice(PREFIX.length) })
    }
  }
  return candidates
}

export default findCandidates
