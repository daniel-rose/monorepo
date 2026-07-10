import { CredentialReason } from './types.ts'

export const PUBLIC_ENV_PREFIX = 'NEXT_PUBLIC_'

/** Shannon entropy (bits/char) above which an opaque value is treated as a secret. */
export const DEFAULT_ENTROPY_THRESHOLD = 4

/** Values shorter than this are never flagged by the entropy heuristic. */
export const MIN_SECRET_LENGTH = 25

/** High-precision patterns for values that are never meant to be public. */
export const CREDENTIAL_PATTERNS: ReadonlyArray<{
  reason: CredentialReason
  regex: RegExp
}> = [
  {
    reason: CredentialReason.PrivateKey,
    regex: /-----BEGIN(?: [A-Z]+)* PRIVATE KEY-----/,
  },
  // Stripe / Restricted secret keys (publishable pk_ keys are intentionally public).
  {
    reason: CredentialReason.KnownSecretPattern,
    regex: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{10,}/,
  },
  // GitHub personal access / OAuth / server / user tokens.
  {
    reason: CredentialReason.KnownSecretPattern,
    regex: /\bgh[posu]_[A-Za-z0-9]{20,}/,
  },
  {
    reason: CredentialReason.KnownSecretPattern,
    regex: /\bgithub_pat_[A-Za-z0-9_]{20,}/,
  },
  // Slack tokens.
  {
    reason: CredentialReason.KnownSecretPattern,
    regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
  },
  // AWS access key id.
  {
    reason: CredentialReason.KnownSecretPattern,
    regex: /\bAKIA[0-9A-Z]{16}\b/,
  },
  // user:password@ inside a connection URL.
  {
    reason: CredentialReason.CredentialsInUrl,
    regex: /\w+:\/\/[^/\s:@]+:[^/\s:@]+@/,
  },
]

/** secretlint recommended preset package id (optional peer dependency). */
export const SECRETLINT_PRESET_ID =
  '@secretlint/secretlint-rule-preset-recommend'

/** Value prefixes of tokens that are intentionally public, exempt from the entropy heuristic. */
export const PUBLIC_VALUE_ALLOWLIST_PREFIXES: readonly string[] = [
  'pk_live_', // Stripe publishable key
  'pk_test_',
  'pk.', // Mapbox public token
  'phc_', // PostHog project key
  'G-', // Google Analytics 4
  'UA-', // Universal Analytics
  'AIza', // Google browser API key
]
