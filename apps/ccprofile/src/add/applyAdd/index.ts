import { mkdir } from 'node:fs/promises'

import failWith from '../../cli/commands/failWith'
import type { ExitCode } from '../../constants'
import { ADD_TEXT, EXIT_CODE, RESOLVE_MESSAGE } from '../../constants'
import type { Context } from '../../context/types'
import validateConfig from '../../init/validateConfig'
import { readText, writeFileAtomic } from '../../setup'
import type { ConfigSnapshot } from '../types'

type Change = {
  json: Record<string, unknown>
  text: string
  newDirs: readonly string[]
}

const errorCode = (error: unknown): string =>
  error instanceof Error && 'code' in error ? String(error.code) : 'error'

// Creates the new directories and writes the config, in that order: a
// failed write leaves empty directories, never a config that points to a
// missing Codex home. The file is compared with the snapshot before the
// first directory and again right before the write; the config is checked
// once more after mkdir (a symlinked parent can make two paths one).
const applyAdd = async (
  snapshot: ConfigSnapshot,
  change: Change,
  ctx: Context
): Promise<ExitCode> => {
  const { path } = snapshot
  const created: string[] = []
  const fail = (...messages: string[]) =>
    failWith(ctx, [
      ...messages,
      ...(created.length > 0 ? [ADD_TEXT.leftDirs(created)] : []),
    ])
  const unchanged = async () => {
    try {
      return (await readText(path)) === snapshot.text
    } catch {
      return false
    }
  }

  if (!(await unchanged())) return fail(ADD_TEXT.changedMeanwhile(path))
  for (const dir of change.newDirs) {
    try {
      if ((await mkdir(dir, { recursive: true })) !== undefined) {
        created.push(dir)
      }
    } catch (error) {
      return fail(ADD_TEXT.createFailed(dir, errorCode(error)))
    }
  }

  const issues = await validateConfig(change.json, ctx)
  if (issues.length > 0) {
    return fail(ADD_TEXT.invalidConfig, ...issues.map(RESOLVE_MESSAGE.issue))
  }
  if (!(await unchanged())) return fail(ADD_TEXT.changedMeanwhile(path))
  try {
    await writeFileAtomic(path, change.text)
  } catch (error) {
    return fail(ADD_TEXT.writeFailed(path, errorCode(error)))
  }

  for (const dir of created) ctx.stderr.write(`${ADD_TEXT.created(dir)}\n`)
  ctx.stderr.write(`${ADD_TEXT.wrote(path)}\n`)
  return EXIT_CODE.ok
}

export default applyAdd
