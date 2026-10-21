import {
  CREDENTIAL_PATTERNS,
  DEFAULT_ENTROPY_THRESHOLD,
  MIN_SECRET_LENGTH,
  PUBLIC_VALUE_ALLOWLIST_PREFIXES,
} from '../../constants'
import {
  CredentialReason,
  type CredentialFinding,
  type Env,
  type ScanOptions,
} from '../../types.ts'

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

  // Clone each pattern so a stateful /g or /y flag (lastIndex) can't skip
  // matches across values.
  const hasCustomMatch = (options.patterns ?? []).some(pattern =>
    new RegExp(pattern).test(value)
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

const scanForCredentials = (
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

export default scanForCredentials
