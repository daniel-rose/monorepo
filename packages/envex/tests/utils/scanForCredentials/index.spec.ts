import { expect, test } from 'vitest'
import { EnvexCredentialLeakError } from '../../../src/errors.ts'
import { CredentialReason } from '../../../src/types.ts'
import {
  assertNoCredentialLeak,
  scanForCredentials,
} from '../../../src/utils/scanForCredentials'

const PRIVATE_KEY =
  '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----'

// Assembled from parts so GitHub push protection does not flag this test
// fixture as a real Stripe key. The runtime value is a normal Stripe-shaped
// secret so the scanner still exercises its detection.
const STRIPE_SECRET = ['sk', 'live', 'abcdEFGH1234567890ijklMNOP'].join('_')

test('flags PEM private keys', () => {
  const findings = scanForCredentials({ NEXT_PUBLIC_KEY: PRIVATE_KEY })

  expect(findings).toEqual([
    { key: 'NEXT_PUBLIC_KEY', reason: CredentialReason.PrivateKey },
  ])
})

test('flags known secret prefixes (Stripe secret key)', () => {
  const findings = scanForCredentials({
    NEXT_PUBLIC_STRIPE: STRIPE_SECRET,
  })

  expect(findings).toEqual([
    { key: 'NEXT_PUBLIC_STRIPE', reason: CredentialReason.KnownSecretPattern },
  ])
})

test('flags AWS access key ids', () => {
  const findings = scanForCredentials({
    NEXT_PUBLIC_AWS: 'AKIAIOSFODNN7EXAMPLE',
  })

  expect(findings).toEqual([
    { key: 'NEXT_PUBLIC_AWS', reason: CredentialReason.KnownSecretPattern },
  ])
})

test('flags credentials embedded in a connection URL', () => {
  const findings = scanForCredentials({
    NEXT_PUBLIC_DB: 'postgres://admin:s3cr3tpw@db.internal:5432/app',
  })

  expect(findings).toEqual([
    { key: 'NEXT_PUBLIC_DB', reason: CredentialReason.CredentialsInUrl },
  ])
})

test('flags credentials in URLs with compound schemes', () => {
  const findings = scanForCredentials({
    NEXT_PUBLIC_DB: 'postgresql+psycopg2://admin:s3cr3tpw@db.internal/app',
  })

  expect(findings).toEqual([
    { key: 'NEXT_PUBLIC_DB', reason: CredentialReason.CredentialsInUrl },
  ])
})

test('handles stateful (/g) custom patterns across values', () => {
  const findings = scanForCredentials(
    { NEXT_PUBLIC_A: 'token', NEXT_PUBLIC_B: 'token' },
    { patterns: [/token/g] }
  )

  expect(findings).toEqual([
    { key: 'NEXT_PUBLIC_A', reason: CredentialReason.KnownSecretPattern },
    { key: 'NEXT_PUBLIC_B', reason: CredentialReason.KnownSecretPattern },
  ])
})

test('flags high-entropy opaque tokens', () => {
  const findings = scanForCredentials({
    NEXT_PUBLIC_TOKEN: 'Zk9xQ2vT7pR4wN1mB6yH8sL3aD5eF0gJ2cU',
  })

  expect(findings).toEqual([
    { key: 'NEXT_PUBLIC_TOKEN', reason: CredentialReason.HighEntropy },
  ])
})

test('does not flag legitimately public values', () => {
  const findings = scanForCredentials({
    NEXT_PUBLIC_STRIPE_PK: 'pk_live_abcdEFGH1234567890ijklMNOP',
    NEXT_PUBLIC_GOOGLE_MAPS: 'AIzaSyD-1234567890abcdefghijklmnopqrst',
    NEXT_PUBLIC_GA_ID: 'G-ABCDEF1234',
    NEXT_PUBLIC_SENTRY_DSN:
      'https://0123456789abcdef0123456789abcdef@o1.ingest.sentry.io/42',
    NEXT_PUBLIC_API_URL: 'https://api.example.com/v1',
    NEXT_PUBLIC_APP_NAME: 'MyApp',
  })

  expect(findings).toEqual([])
})

test('skips keys on the allowlist', () => {
  const findings = scanForCredentials(
    { NEXT_PUBLIC_TOKEN: 'Zk9xQ2vT7pR4wN1mB6yH8sL3aD5eF0gJ2cU' },
    { allowlist: ['NEXT_PUBLIC_TOKEN'] }
  )

  expect(findings).toEqual([])
})

test('entropyThreshold=false disables only the entropy heuristic', () => {
  const env = {
    NEXT_PUBLIC_TOKEN: 'Zk9xQ2vT7pR4wN1mB6yH8sL3aD5eF0gJ2cU',
    NEXT_PUBLIC_STRIPE: STRIPE_SECRET,
  }

  const findings = scanForCredentials(env, { entropyThreshold: false })

  expect(findings).toEqual([
    { key: 'NEXT_PUBLIC_STRIPE', reason: CredentialReason.KnownSecretPattern },
  ])
})

test('custom patterns extend detection', () => {
  const findings = scanForCredentials(
    { NEXT_PUBLIC_INTERNAL: 'oeg-internal-token-value' },
    { patterns: [/oeg-internal-token/] }
  )

  expect(findings).toEqual([
    {
      key: 'NEXT_PUBLIC_INTERNAL',
      reason: CredentialReason.KnownSecretPattern,
    },
  ])
})

test('findings never contain the secret value', () => {
  const secret = STRIPE_SECRET
  const findings = scanForCredentials({ NEXT_PUBLIC_STRIPE: secret })

  const serialized = JSON.stringify(findings)
  expect(serialized).not.toContain(secret)
})

test('assertNoCredentialLeak throws EnvexCredentialLeakError with findings', async () => {
  const secret = STRIPE_SECRET

  let caught: unknown
  try {
    await assertNoCredentialLeak({ NEXT_PUBLIC_STRIPE: secret }, true)
  } catch (error) {
    caught = error
  }

  expect(caught).toBeInstanceOf(EnvexCredentialLeakError)
  expect((caught as EnvexCredentialLeakError).findings).toEqual([
    { key: 'NEXT_PUBLIC_STRIPE', reason: CredentialReason.KnownSecretPattern },
  ])
  expect((caught as EnvexCredentialLeakError).message).not.toContain(secret)
})

test('assertNoCredentialLeak passes silently for clean env', async () => {
  await expect(
    assertNoCredentialLeak(
      { NEXT_PUBLIC_API_URL: 'https://api.example.com' },
      true
    )
  ).resolves.toBeUndefined()
})

test('assertNoCredentialLeak is a no-op when scanning is disabled', async () => {
  const env = { NEXT_PUBLIC_STRIPE: STRIPE_SECRET }

  await expect(assertNoCredentialLeak(env)).resolves.toBeUndefined()
  await expect(assertNoCredentialLeak(env, false)).resolves.toBeUndefined()
})

test('assertNoCredentialLeak accepts scan options and honors the allowlist', async () => {
  const env = { NEXT_PUBLIC_STRIPE: STRIPE_SECRET }

  await expect(
    assertNoCredentialLeak(env, { allowlist: ['NEXT_PUBLIC_STRIPE'] })
  ).resolves.toBeUndefined()
})
