import { readFile } from 'node:fs/promises'

import { CONFIG_FILE, LOAD_STATUS } from '../../constants'
import type { Context } from '../../context/types'
import formatIssues from '../formatIssues'
import locateConfig from '../locateConfig'
import pathFlavor from '../pathFlavor'
import resolveConfig from '../resolveConfig'
import configSchema from '../schema'
import type { LoadConfigResult } from '../types'

const MISSING_CODES = new Set(['ENOENT', 'ENOTDIR'])

const errorCode = (error: unknown): string | undefined =>
  error instanceof Error && 'code' in error ? String(error.code) : undefined

const loadConfig = async (ctx: Context): Promise<LoadConfigResult> => {
  const path = locateConfig(ctx)
  const name = pathFlavor(ctx.platform).basename(path)
  const invalid = (...issues: string[]): LoadConfigResult => ({
    status: LOAD_STATUS.invalid,
    path,
    issues,
  })

  let raw: string
  try {
    raw = await readFile(path, 'utf8')
  } catch (error) {
    const code = errorCode(error)
    if (code !== undefined && MISSING_CODES.has(code)) {
      return { status: LOAD_STATUS.missing, path }
    }
    return invalid(`${name}: cannot read file (${code ?? 'unknown error'})`)
  }

  let json: unknown
  try {
    const { byteOrderMark } = CONFIG_FILE
    json = JSON.parse(
      raw.startsWith(byteOrderMark) ? raw.slice(byteOrderMark.length) : raw
    )
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return invalid(`${name}: invalid JSON (${reason})`)
  }

  const parsed = configSchema.safeParse(json)
  if (!parsed.success) return invalid(...formatIssues(parsed.error, name))

  const { issues, config } = await resolveConfig(parsed.data, ctx)
  return issues.length > 0
    ? invalid(...issues)
    : { status: LOAD_STATUS.ok, path, config }
}

export default loadConfig
