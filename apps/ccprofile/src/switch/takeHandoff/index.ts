import { readFile, rm } from 'node:fs/promises'

import { z } from 'zod'

import { SWITCH, SWITCH_TEXT } from '../../constants'
import type { Handoff, HandoffRejection } from '../types'

const versionSchema = z.object({ version: z.number() })

const sessionSchema = z.object({
  sessionId: z.string().regex(SWITCH.sessionIdPattern),
})

const handoffSchema = z.object({
  version: z.literal(SWITCH.handoffVersion),
  profile: z.string(),
  account: z.string(),
  sessionId: z.string(),
})

// The session id of any handoff, when it is a valid one: even a handoff
// that cannot be followed lets the user resume by hand.
const readSessionId = (value: unknown): string | undefined => {
  const session = sessionSchema.safeParse(value)
  return session.success ? session.data.sessionId : undefined
}

const interpret = (value: unknown): Handoff | HandoffRejection => {
  const sessionId = readSessionId(value)
  const versioned = versionSchema.safeParse(value)
  if (!versioned.success) return { reason: SWITCH_TEXT.invalid, sessionId }
  if (versioned.data.version !== SWITCH.handoffVersion) {
    return {
      reason: SWITCH_TEXT.unsupported(versioned.data.version),
      sessionId,
    }
  }
  const handoff = handoffSchema.safeParse(value)
  if (!handoff.success) return { reason: SWITCH_TEXT.invalid, sessionId }
  if (sessionId === undefined) return { reason: SWITCH_TEXT.invalidSessionId }
  const { profile, account } = handoff.data
  return { profile, account, sessionId }
}

// Reads the handoff file and removes it, whatever it holds: a handoff is
// followed once at most (the hook removes it too, should this fail). The
// mod writes it in one go at the end of the session, before claude exits,
// so it is never half written here.
const takeHandoff = async (
  path: string
): Promise<Handoff | HandoffRejection> => {
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch {
    return { reason: SWITCH_TEXT.unreadable }
  } finally {
    await rm(path, { force: true }).catch(() => undefined)
  }
  try {
    return interpret(JSON.parse(text))
  } catch {
    return { reason: SWITCH_TEXT.invalid }
  }
}

export default takeHandoff
