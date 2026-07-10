import {
  CREDENTIAL_PATTERNS,
  DEFAULT_ENTROPY_THRESHOLD,
  MIN_SECRET_LENGTH,
  PUBLIC_VALUE_ALLOWLIST_PREFIXES,
} from '../../constants.ts'
import { EnvexCredentialLeakError } from '../../errors.ts'
import {
  CredentialReason,
  ScanEngine,
  type CredentialFinding,
  type Env,
  type ScanConfig,
  type ScanOptions,
} from '../../types.ts'
import { scanWithSecretlint } from '../scanWithSecretlint'

const shannonEntropy = (value: string): number => {
  const counts = new Map<string, number>()

  for (const char of value) {
    counts.set(char, (counts.get(char) ?? 0) + 1)
  }

  return [...counts.values()].reduce((entropy, count) => {
    const probability = count / value.length

    return entropy - probability * Math.log2(probability)
  }, 0)
}

const isPublicAllowlistedValue = (value: string): boolean =>
  PUBLIC_VALUE_ALLOWLIST_PREFIXES.some(prefix => value.startsWith(prefix))

const looksLikeHighEntropySecret = (
  value: string,
  threshold: number
): boolean => {
  // Only opaque tokens are candidates: no URL structure, no whitespace.
  const isOpaqueToken = !value.includes('://') && !/\s/.test(value)

  return (
    isOpaqueToken &&
    value.length >= MIN_SECRET_LENGTH &&
    !isPublicAllowlistedValue(value) &&
    shannonEntropy(value) > threshold
  )
}

const detectReason = (
  value: string,
  options: ScanOptions
): CredentialReason | null => {
  const knownReason = CREDENTIAL_PATTERNS.find(({ regex }) =>
    regex.test(value)
  )?.reason

  const hasCustomMatch = (options.patterns ?? []).some(pattern =>
    pattern.test(value)
  )

  const threshold = options.entropyThreshold ?? DEFAULT_ENTROPY_THRESHOLD
  const isHighEntropy =
    threshold !== false && looksLikeHighEntropySecret(value, threshold)

  return (
    knownReason ??
    (hasCustomMatch ? CredentialReason.KnownSecretPattern : null) ??
    (isHighEntropy ? CredentialReason.HighEntropy : null)
  )
}

export const scanForCredentials = (
  env: Env,
  options: ScanOptions = {}
): CredentialFinding[] => {
  const allowlist = new Set(options.allowlist ?? [])

  return Object.entries(env).flatMap(([key, value]) => {
    const reason =
      value && !allowlist.has(key) ? detectReason(value, options) : null

    return reason ? [{ key, reason }] : []
  })
}

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
export const assertNoCredentialLeak = async (
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
