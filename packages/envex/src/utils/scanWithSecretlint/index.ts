import { SECRETLINT_PRESET_ID } from '../../constants.ts'
import {
  CredentialReason,
  type CredentialFinding,
  type Env,
  type ScanOptions,
} from '../../types.ts'

const missingPeerDependencyError = (cause: unknown): Error =>
  Object.assign(
    new Error(
      `envex: scan engine 'secretlint' requires the optional peer dependencies ` +
        `'@secretlint/core' and '${SECRETLINT_PRESET_ID}'. ` +
        `Install them, or use the default built-in engine.`
    ),
    { cause }
  )

/**
 * The `webpackIgnore` / `turbopackIgnore` hints keep the specifiers out of the
 * consumer's module graph: both peers are optional, so a bundler that tries to
 * resolve them reports `Module not found: Can't resolve '@secretlint/core'` in
 * every build that does not install them — a warning about code the consumer
 * deliberately opted out of. With the hints the call stays a plain runtime
 * `import()`, which is what the `catch` below has always been written for.
 *
 * The comments have to survive into `dist/`, which is why the build keeps
 * comments attached to their expression (see `vite.config.ts`).
 */
const loadSecretlint = async () => {
  try {
    const [core, preset] = await Promise.all([
      import(
        /* webpackIgnore: true */ /* turbopackIgnore: true */ '@secretlint/core'
      ),
      import(
        /* webpackIgnore: true */ /* turbopackIgnore: true */ '@secretlint/secretlint-rule-preset-recommend'
      ),
    ])

    return { lintSource: core.lintSource, creator: preset.creator }
  } catch (error) {
    throw missingPeerDependencyError(error)
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
