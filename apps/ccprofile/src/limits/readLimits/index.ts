import { readFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'

import { z } from 'zod'

import { LIMITS, LIMITS_STATUS } from '../../constants'
import type { Context } from '../../context/types'
import limitsPath from '../limitsPath'
import type { LimitsReading } from '../types'

const MISSING_CODES: readonly string[] = ['ENOENT', 'ENOTDIR']

const versionSchema = z.object({ version: z.number() })

// Format 1 as the mod writes it. Extra fields and unknown window kinds are
// fine; a wrong type anywhere makes the whole file no data.
const fileSchema = z.object({
  version: z.literal(LIMITS.version),
  seenAt: z.string(),
  rateLimits: z.array(
    z.object({
      kind: z.string(),
      percentUsed: z.number(),
      resetsAt: z.string().optional(),
    })
  ),
})

const toTime = (value: string | undefined): number | undefined => {
  if (value === undefined) return undefined
  const time = Date.parse(value)
  return Number.isNaN(time) ? undefined : time
}

const interpret = (value: unknown): LimitsReading => {
  const versioned = versionSchema.safeParse(value)
  if (!versioned.success) return { status: LIMITS_STATUS.invalid }
  if (versioned.data.version !== LIMITS.version) {
    return {
      status: LIMITS_STATUS.unsupported,
      version: versioned.data.version,
    }
  }

  const file = fileSchema.safeParse(value)
  const seenAt = file.success ? toTime(file.data.seenAt) : undefined
  if (!file.success || seenAt === undefined) {
    return { status: LIMITS_STATUS.invalid }
  }
  return {
    status: LIMITS_STATUS.ok,
    seenAt,
    windows: file.data.rateLimits.map(({ kind, percentUsed, resetsAt }) => ({
      kind,
      percentUsed,
      resetsAt: toTime(resetsAt),
    })),
  }
}

// One read; null for text that is no JSON (possibly half written).
const readOnce = async (path: string): Promise<LimitsReading | null> => {
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch (error) {
    return MISSING_CODES.includes((error as NodeJS.ErrnoException).code ?? '')
      ? { status: LIMITS_STATUS.missing }
      : { status: LIMITS_STATUS.invalid }
  }
  try {
    return interpret(JSON.parse(text))
  } catch {
    return null
  }
}

// The limit file of one account. Never throws: missing, unreadable or broken
// files are reported as such and count as no data. The mod writes without
// rename, so text that is no JSON is read once more after a short pause.
const readLimits = async (
  configDir: string | undefined,
  ctx: Pick<Context, 'homedir' | 'platform'>
): Promise<LimitsReading> => {
  const path = limitsPath(configDir, ctx)
  const first = await readOnce(path)
  if (first !== null) return first

  await sleep(LIMITS.retryDelayMs)
  return (await readOnce(path)) ?? { status: LIMITS_STATUS.invalid }
}

export default readLimits
