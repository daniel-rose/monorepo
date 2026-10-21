import { CredentialReason } from '../../types.ts'

/** High-precision patterns for values that are never meant to be public. */
const CREDENTIAL_PATTERNS: ReadonlyArray<{
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
  // user:password@ inside a connection URL (scheme may be compound, e.g. postgresql+psycopg2).
  {
    reason: CredentialReason.CredentialsInUrl,
    regex: /[\w+.-]+:\/\/[^/\s:@]+:[^/\s:@]+@/,
  },
]

export default CREDENTIAL_PATTERNS
