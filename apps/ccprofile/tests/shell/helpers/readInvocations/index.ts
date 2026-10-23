import { existsSync, readFileSync } from 'node:fs'

import type { Invocation } from '../../types'

const ARG_PATTERN = /^ARG<<(.*)>>$/s
const FIELDS = {
  'CCPROFILE=': 'ccprofile',
  'CLAUDE_CONFIG_DIR=': 'claudeConfigDir',
  'CCPROFILE_ARGV=': 'ccprofileArgv',
} as const

// Parses FAKE_CLAUDE_LOG: every `CCPROFILE=` line starts the report of one
// fake claude run. No log means claude was never started.
const readInvocations = (logPath: string): Invocation[] => {
  if (!existsSync(logPath)) return []

  const invocations: Invocation[] = []
  for (const line of readFileSync(logPath, 'utf8').split('\n')) {
    if (line.startsWith('CCPROFILE=')) {
      invocations.push({
        ccprofile: '',
        claudeConfigDir: '',
        ccprofileArgv: '',
        args: [],
      })
    }
    const current = invocations.at(-1)
    if (current === undefined || line === '') continue

    const arg = ARG_PATTERN.exec(line)
    if (arg !== null) {
      current.args.push(arg[1])
      continue
    }
    for (const [prefix, field] of Object.entries(FIELDS)) {
      if (line.startsWith(prefix)) current[field] = line.slice(prefix.length)
    }
  }
  return invocations
}

export default readInvocations
