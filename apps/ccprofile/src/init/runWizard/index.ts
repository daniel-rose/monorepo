import { basename } from 'node:path'

import { expandHome } from '../../config'
import pathFlavor from '../../config/pathFlavor'
import {
  CONFIG_FILE,
  CONFIG_PATTERN,
  INIT_PATTERN,
  INIT_TEXT,
  ON_UNKNOWN_PROMPT,
} from '../../constants'
import type { Context } from '../../context/types'
import { normalizeRemote } from '../../match'
import type { LineReader } from '../../prompt'
import { createLineReader } from '../../prompt'
import formatAuth from '../formatAuth'
import readAuthStatus from '../readAuthStatus'
import suggestRemote from '../suggestRemote'
import type { Candidate, DraftProfile, WizardResult } from '../types'

const toHomeForm = (configDir: string): string =>
  `${CONFIG_FILE.homeMarker}/${basename(configDir)}`

const splitEntries = (answer: string): string[] =>
  answer
    .split(INIT_PATTERN.separator)
    .map(entry => entry.trim())
    .filter(entry => entry !== '')

// Empty string = skip this candidate; null = end of input.
const askName = async (
  reader: LineReader,
  candidate: Candidate,
  taken: readonly string[],
  ctx: Context
): Promise<string | null> => {
  for (;;) {
    const line = await reader.readLine(
      INIT_TEXT.namePrompt(candidate.suggestedName)
    )
    if (line === null) return null
    const name = line.trim()
    if (
      name === '' ||
      (CONFIG_PATTERN.name.test(name) &&
        name !== ON_UNKNOWN_PROMPT &&
        !taken.includes(name))
    ) {
      return name
    }
    ctx.stderr.write(`${INIT_TEXT.badName(name)}\n`)
  }
}

// The hint for the first unusable entry, undefined when all are fine.
const rejectEntry = (
  entries: readonly string[],
  ctx: Context
): string | undefined => {
  const flavor = pathFlavor(ctx.platform)
  for (const entry of entries) {
    if (INIT_PATTERN.pathEntry.test(entry)) {
      if (!flavor.isAbsolute(expandHome(entry, ctx.homedir))) {
        return INIT_TEXT.badPath(entry)
      }
    } else if (normalizeRemote(entry) === null) {
      return INIT_TEXT.badRemote(entry)
    }
  }
  return undefined
}

const askMatchers = async (
  reader: LineReader,
  name: string,
  suggestion: string | undefined,
  ctx: Context
): Promise<string[] | null> => {
  for (;;) {
    const line = await reader.readLine(
      INIT_TEXT.matcherPrompt(name, suggestion)
    )
    if (line === null) return null
    const answer = line.trim()
    const entries = splitEntries(
      answer === '' && suggestion !== undefined ? suggestion : answer
    )
    if (entries.length === 0) {
      ctx.stderr.write(`${INIT_TEXT.matcherRequired}\n`)
      continue
    }
    const rejected = rejectEntry(entries, ctx)
    if (rejected === undefined) return entries
    ctx.stderr.write(`${rejected}\n`)
  }
}

const askOnUnknown = async (
  reader: LineReader,
  names: readonly string[],
  ctx: Context
): Promise<string | null> => {
  for (;;) {
    const line = await reader.readLine(INIT_TEXT.onUnknownPrompt(names))
    if (line === null) return null
    const answer = line.trim()
    if (answer === '') return ON_UNKNOWN_PROMPT
    if (answer === ON_UNKNOWN_PROMPT || names.includes(answer)) return answer
    ctx.stderr.write(`${INIT_TEXT.badOnUnknown(answer)}\n`)
  }
}

// Asks for a name and matchers per candidate. Returns null when the input
// ends early (nothing is to be written then).
const runWizard = async (
  ctx: Context,
  candidates: readonly Candidate[]
): Promise<WizardResult | null> => {
  const reader = createLineReader(ctx)
  try {
    const suggestion = await suggestRemote(ctx)
    const profiles: DraftProfile[] = []

    for (const candidate of candidates) {
      const auth = await readAuthStatus(candidate.configDir, ctx)
      const label =
        candidate.configDir === undefined
          ? INIT_TEXT.defaultLabel
          : toHomeForm(candidate.configDir)
      ctx.stderr.write(`${INIT_TEXT.candidate(label, formatAuth(auth))}\n`)

      const name = await askName(
        reader,
        candidate,
        profiles.map(profile => profile.name),
        ctx
      )
      if (name === null) return null
      if (name === '') continue

      const entries = await askMatchers(reader, name, suggestion, ctx)
      if (entries === null) return null

      profiles.push({
        name,
        ...(candidate.configDir !== undefined && {
          configDir: toHomeForm(candidate.configDir),
        }),
        paths: entries.filter(entry => INIT_PATTERN.pathEntry.test(entry)),
        remotes: entries.filter(entry => !INIT_PATTERN.pathEntry.test(entry)),
      })
    }

    if (profiles.length === 0) return { profiles, onUnknown: ON_UNKNOWN_PROMPT }

    const onUnknown = await askOnUnknown(
      reader,
      profiles.map(profile => profile.name),
      ctx
    )
    return onUnknown === null ? null : { profiles, onUnknown }
  } finally {
    reader.close()
  }
}

export default runWizard
