import { chmodSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FIXTURE = fileURLToPath(
  new URL('../../fixtures/fake-claude-auth.mjs', import.meta.url)
)

let runs = 0

// Puts an executable `claude` (POSIX shell wrapper around the fixture) into
// `<root>/bin` and returns the env that selects it. POSIX only.
const installFakeClaude = (
  root: string,
  mode: string
): { bin: string; env: Record<string, string>; log: string } => {
  const bin = join(root, 'bin')
  mkdirSync(bin, { recursive: true })
  const wrapper = join(bin, 'claude')
  writeFileSync(
    wrapper,
    `#!/bin/sh\nexec "${process.execPath}" "${FIXTURE}" "$@"\n`
  )
  chmodSync(wrapper, 0o755)
  runs += 1
  const log = join(root, `auth-${mode}-${runs}.log`)
  return {
    bin,
    log,
    env: {
      PATH: `${bin}:${process.env.PATH ?? ''}`,
      FAKE_AUTH_MODE: mode,
      FAKE_AUTH_LOG: log,
    },
  }
}

export default installFakeClaude
