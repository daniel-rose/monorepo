export type Env = Record<string, string | undefined>

export type EnvFetchStrategy = (endpoint: string) => Promise<Env>

export const CredentialReason = {
  PrivateKey: 'private-key',
  KnownSecretPattern: 'known-secret-pattern',
  CredentialsInUrl: 'credentials-in-url',
  HighEntropy: 'high-entropy',
} as const

export type CredentialReason =
  (typeof CredentialReason)[keyof typeof CredentialReason]

export interface CredentialFinding {
  key: string
  reason: CredentialReason
}

export const ScanEngine = {
  /** Zero-dependency built-in patterns + entropy heuristic. */
  Builtin: 'builtin',
  /** Delegate to secretlint's recommended preset (optional peer dependency). */
  Secretlint: 'secretlint',
} as const

export type ScanEngine = (typeof ScanEngine)[keyof typeof ScanEngine]

export interface ScanOptions {
  /** Detection engine. Defaults to the built-in scanner. */
  engine?: ScanEngine
  /** Env variable names that are known to be safe and skip scanning. */
  allowlist?: string[]
  /** Additional secret patterns to flag (built-in engine only). */
  patterns?: RegExp[]
  /** Shannon-entropy threshold (bits/char); `false` disables it (built-in engine only). */
  entropyThreshold?: number | false
}

/** Enables scanning: `true` uses defaults, an object configures it, absent/`false` disables. */
export type ScanConfig = boolean | ScanOptions

declare global {
  interface Window {
    ENV?: Env
  }
}
