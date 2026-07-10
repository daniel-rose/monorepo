import { SECRETLINT_PRESET_ID } from '../../constants.ts'
import {
  CredentialReason,
  type CredentialFinding,
  type Env,
  type ScanOptions,
} from '../../types.ts'

const missingPeerDependencyError = (): Error =>
  new Error(
    `envex: scan engine 'secretlint' requires the optional peer dependencies ` +
      `'@secretlint/core' and '${SECRETLINT_PRESET_ID}'. ` +
      `Install them, or use the default built-in engine.`
  )

const loadSecretlint = async () => {
  try {
    const [core, preset] = await Promise.all([
      import('@secretlint/core'),
      import('@secretlint/secretlint-rule-preset-recommend'),
    ])

    return { lintSource: core.lintSource, creator: preset.creator }
  } catch {
    throw missingPeerDependencyError()
  }
}

/**
 * Scans each value with secretlint's recommended preset. Runs one lint per value
 * so a finding maps back to its exact key (and multiline values stay intact).
 * Only key + reason are returned — never the value, which secretlint echoes into
 * its own messages.
 */
export const scanWithSecretlint = async (
  env: Env,
  options: ScanOptions = {}
): Promise<CredentialFinding[]> => {
  const allowlist = new Set(options.allowlist ?? [])
  const entries = Object.entries(env).filter(
    ([key, value]) => value && !allowlist.has(key)
  )

  const { lintSource, creator } = await loadSecretlint()

  const config = {
    rules: [
      { id: SECRETLINT_PRESET_ID, rule: creator, rules: [], options: {} },
    ],
  }

  const findings = await Promise.all(
    entries.map(async ([key, value]): Promise<CredentialFinding | null> => {
      const result = await lintSource({
        source: {
          content: value as string,
          contentType: 'text',
          filePath: 'env',
          ext: '.txt',
        },
        options: { config, maskSecrets: true, noPhysicFilePath: true },
      })

      return result.messages.length > 0
        ? { key, reason: CredentialReason.KnownSecretPattern }
        : null
    })
  )

  return findings.filter(
    (finding): finding is CredentialFinding => finding !== null
  )
}
