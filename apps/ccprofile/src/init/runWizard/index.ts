import { basename } from 'node:path'

import {
  AUTH_STATE,
  CONFIG_FILE,
  INIT_PATTERN,
  INIT_TEXT,
  ON_UNKNOWN_PROMPT,
} from '../../constants'
import type { Context } from '../../context/types'
import type { Choice } from '../../prompt'
import { checkbox, input, select } from '../../prompt'
import formatAuth from '../formatAuth'
import readAuthStatus from '../readAuthStatus'
import splitMatchers from '../splitMatchers'
import suggestRemote from '../suggestRemote'
import type { Candidate, DraftProfile, WizardResult } from '../types'
import validateMatchers from '../validateMatchers'
import validateName from '../validateName'

const toHomeForm = (configDir: string): string =>
  `${CONFIG_FILE.homeMarker}/${basename(configDir)}`

const labelOf = (candidate: Candidate): string =>
  candidate.configDir === undefined
    ? INIT_TEXT.defaultLabel
    : toHomeForm(candidate.configDir)

// Logged-in directories are preselected.
const toChoice = async (
  candidate: Candidate,
  ctx: Context
): Promise<Choice<Candidate>> => {
  const auth = await readAuthStatus(candidate.configDir, ctx)
  return {
    value: candidate,
    name: INIT_TEXT.candidate(labelOf(candidate), formatAuth(auth)),
    checked: auth.state === AUTH_STATE.loggedIn,
  }
}

// Name and matchers of one picked directory; null when the user aborts.
// The only profile needs no matchers: it is written as `onUnknown`.
const askProfile = async (
  candidate: Candidate,
  context: { taken: readonly string[]; suggestion?: string; only: boolean },
  ctx: Context
): Promise<DraftProfile | null> => {
  const name = await input(
    {
      message: INIT_TEXT.namePrompt(labelOf(candidate)),
      default: candidate.suggestedName,
      validate: value => validateName(value, context.taken),
    },
    ctx
  )
  if (name === null) return null

  const required = !context.only
  const answer = await input(
    {
      message: INIT_TEXT.matcherPrompt(name, required),
      default: context.suggestion,
      validate: value => validateMatchers(value, required, ctx),
    },
    ctx
  )
  if (answer === null) return null

  const entries = splitMatchers(answer)
  return {
    name,
    ...(candidate.configDir !== undefined && {
      configDir: toHomeForm(candidate.configDir),
    }),
    paths: entries.filter(entry => INIT_PATTERN.pathEntry.test(entry)),
    remotes: entries.filter(entry => !INIT_PATTERN.pathEntry.test(entry)),
  }
}

const askOnUnknown = (
  names: readonly string[],
  ctx: Context
): Promise<string | null> =>
  select(
    {
      message: INIT_TEXT.onUnknownPrompt,
      choices: [
        {
          value: ON_UNKNOWN_PROMPT,
          name: ON_UNKNOWN_PROMPT,
          description: INIT_TEXT.askEveryTime,
        },
        ...names.map(name => ({
          value: name,
          name,
          description: INIT_TEXT.useProfile(name),
        })),
      ],
      default: ON_UNKNOWN_PROMPT,
    },
    ctx
  )

// Asks which directories become profiles, then name and matchers of each.
// Returns null when the user aborts (nothing is to be written then).
const runWizard = async (
  ctx: Context,
  candidates: readonly Candidate[]
): Promise<WizardResult | null> => {
  const choices = await Promise.all(
    candidates.map(candidate => toChoice(candidate, ctx))
  )
  const picked = await checkbox(
    { message: INIT_TEXT.candidatesPrompt, choices },
    ctx
  )
  if (picked === null) return null

  const suggestion = await suggestRemote(ctx)
  const only = picked.length === 1
  const profiles: DraftProfile[] = []
  for (const candidate of picked) {
    const taken = profiles.map(profile => profile.name)
    const profile = await askProfile(
      candidate,
      { taken, suggestion, only },
      ctx
    )
    if (profile === null) return null
    profiles.push(profile)
  }

  const [first] = profiles
  if (only && first !== undefined) return { profiles, onUnknown: first.name }

  const onUnknown = await askOnUnknown(
    profiles.map(profile => profile.name),
    ctx
  )
  return onUnknown === null ? null : { profiles, onUnknown }
}

export default runWizard
