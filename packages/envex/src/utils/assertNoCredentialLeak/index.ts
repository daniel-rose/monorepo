import { EnvexCredentialLeakError } from '../../errors'
import {
  ScanEngine,
  type CredentialFinding,
  type Env,
  type ScanConfig,
  type ScanOptions,
} from '../../types.ts'
import scanForCredentials from '../scanForCredentials'
import scanWithSecretlint from '../scanWithSecretlint'

const normalizeScan = (scan?: ScanConfig): ScanOptions | null =>
  scan === true ? {} : scan || null

const collectFindings = (
  env: Env,
  options: ScanOptions
): CredentialFinding[] | Promise<CredentialFinding[]> =>
  options.engine === ScanEngine.Secretlint
    ? scanWithSecretlint(env, options)
    : scanForCredentials(env, options)

/**
 * Enforces the configured scan, throwing EnvexCredentialLeakError on a hit.
 * No-op when scanning is disabled (`scan` absent or `false`). Async because the
 * secretlint engine is async; the built-in engine resolves immediately.
 */
const assertNoCredentialLeak = async (
  env: Env,
  scan?: ScanConfig
): Promise<void> => {
  const options = normalizeScan(scan)

  // Guard clause: scanning disabled.
  if (!options) {
    return
  }

  const findings = await collectFindings(env, options)

  // Guard clause: a throw cannot be an expression.
  if (findings.length > 0) {
    throw new EnvexCredentialLeakError(findings)
  }
}

export default assertNoCredentialLeak
