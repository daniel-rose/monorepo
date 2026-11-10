import { toConfigProfile } from '../../profile'
import type { AddDraft, ConfigSnapshot } from '../types'

const JSON_INDENT = 2

// The parsed file with the new profile at its index; every other key and
// value stays as it was, in its place. Returned with its text (two-space
// indent, LF, final newline – the format `init` writes).
const insertProfile = (
  { json }: ConfigSnapshot,
  { profile, index }: AddDraft
): { json: Record<string, unknown>; text: string } => {
  const profiles: unknown[] = Array.isArray(json.profiles) ? json.profiles : []
  const next = {
    ...json,
    profiles: [
      ...profiles.slice(0, index),
      toConfigProfile(profile),
      ...profiles.slice(index),
    ],
  }
  return { json: next, text: `${JSON.stringify(next, null, JSON_INDENT)}\n` }
}

export default insertProfile
