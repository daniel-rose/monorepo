import { lstat, mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import failWith from '../../cli/commands/failWith'
import status from '../../cli/commands/status'
import { locateConfig } from '../../config'
import type { ExitCode } from '../../constants'
import { EXAMPLE_CONFIG, INIT_TEXT, SCHEMA_URL } from '../../constants'
import type { Context } from '../../context/types'
import findCandidates from '../findCandidates'
import runWizard from '../runWizard'
import type { DraftProfile } from '../types'
import validateConfig from '../validateConfig'

const JSON_INDENT = 2

// Empty `paths`/`remotes` stay out of the file.
const toConfigProfile = (profile: DraftProfile) => ({
  name: profile.name,
  ...(profile.configDir !== undefined && { configDir: profile.configDir }),
  ...(profile.remotes.length > 0 && { remotes: profile.remotes }),
  ...(profile.paths.length > 0 && { paths: profile.paths }),
})

const pathExists = async (path: string): Promise<boolean> => {
  try {
    await lstat(path)
    return true
  } catch {
    return false
  }
}

const errorCode = (error: unknown): string =>
  error instanceof Error && 'code' in error ? String(error.code) : 'error'

// Never overwrites: `wx` fails if the file appeared in the meantime.
const writeNew = async (
  path: string,
  config: unknown,
  ctx: Context
): Promise<ExitCode> => {
  const issues = await validateConfig(config, ctx)
  if (issues.length > 0)
    return failWith(ctx, [INIT_TEXT.invalidConfig, ...issues])

  try {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, `${JSON.stringify(config, null, JSON_INDENT)}\n`, {
      flag: 'wx',
    })
  } catch (error) {
    const code = errorCode(error)
    return failWith(ctx, [
      code === 'EEXIST'
        ? INIT_TEXT.exists(path)
        : INIT_TEXT.writeFailed(path, code),
    ])
  }

  ctx.stderr.write(`${INIT_TEXT.wrote(path)}\n`)
  return status(ctx)
}

const runInit = async (
  ctx: Context,
  options: { example: boolean }
): Promise<ExitCode> => {
  const path = locateConfig(ctx)

  // Checked up front so the wizard is not run for nothing.
  if (await pathExists(path)) return failWith(ctx, [INIT_TEXT.exists(path)])

  if (options.example) return writeNew(path, EXAMPLE_CONFIG, ctx)
  if (ctx.stdin.isTTY !== true) return failWith(ctx, [INIT_TEXT.needsTerminal])

  const candidates = await findCandidates(ctx)
  if (candidates.length === 0) return failWith(ctx, [INIT_TEXT.noCandidates])

  const result = await runWizard(ctx, candidates)
  if (result === null) return failWith(ctx, [INIT_TEXT.aborted])
  if (result.profiles.length === 0) return failWith(ctx, [INIT_TEXT.noProfiles])

  return writeNew(
    path,
    {
      $schema: SCHEMA_URL,
      onUnknown: result.onUnknown,
      profiles: result.profiles.map(toConfigProfile),
    },
    ctx
  )
}

export default runInit
