import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

type Window = { kind: string; percentUsed: number; resetsAt?: string }

// A limit file (format 1) in the config dir of an account, as the mod writes
// it; `text` replaces the content (a broken or newer file).
const writeLimits = (dir: string, content: Window[] | string): void => {
  mkdirSync(join(dir, 'ccprofile'), { recursive: true })
  writeFileSync(
    join(dir, 'ccprofile', 'limits.json'),
    typeof content === 'string'
      ? content
      : JSON.stringify({
          version: 1,
          seenAt: '2026-10-25T11:00:00.000Z',
          rateLimits: content,
        })
  )
}

export default writeLimits
