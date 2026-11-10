import { basename } from 'node:path'

import {
  AUTH_STATE,
  CODEX_MODE,
  CONFIG_FILE,
  INIT_TEXT,
  ON_UNKNOWN_PROMPT,
} from '../../constants'
import type { Context } from '../../context/types'
import type { DraftProfile } from '../../profile'
import {
  askCodex,
  askMatchers,
  collectDirKeys,
  validateNewDir,
} from '../../profile'
import type { Choice } from '../../prompt'
import { checkbox, input, select } from '../../prompt'
import formatAuth from '../formatAuth'
import readAuthStatus from '../readAuthStatus'
import suggestRemote from '../suggestRemote'
import type { Candidate, WizardResult } from '../types'
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

type ProfileContext = {
  drafts: readonly DraftProfile[]
  // Every picked directory: an own Codex home must be none of them.
  picked: readonly Candidate[]
  suggestion?: string
  only: boolean
}

// The first profile on ~/.codex keeps it; every further one gets no codex
// unless asked, so ~/.codex is never shared by accident.
const codexPreset = (drafts: readonly DraftProfile[]) =>
  drafts.some(draft => draft.codex.mode === CODEX_MODE.default)
    ? CODEX_MODE.disabled
    : CODEX_MODE.default

const takenDirs = ({ drafts, picked }: ProfileContext): string[] => [
  ...picked.flatMap(({ configDir }) =>
    configDir === undefined ? [] : [configDir]
  ),
  ...drafts.flatMap(({ codex }) =>
    codex.mode === CODEX_MODE.home ? [codex.home] : []
  ),
]

// Name, codex and matchers of one picked directory; null when the user
// aborts. The only profile needs no matchers: it is written as `onUnknown`.
const askProfile = async (
  candidate: Candidate,
  context: ProfileContext,
  ctx: Context
): Promise<DraftProfile | null> => {
  const name = await input(
    {
      message: INIT_TEXT.namePrompt(labelOf(candidate)),
      default: candidate.suggestedName,
      validate: value =>
        validateName(
          value,
          context.drafts.map(draft => draft.name)
        ),
    },
    ctx
  )
  if (name === null) return null

  const taken = await collectDirKeys(takenDirs(context), ctx)
  const codex = await askCodex(
    {
      name,
      preset: codexPreset(context.drafts),
      validateHome: value => validateNewDir(value, taken, ctx),
    },
    ctx
  )
  if (codex === null) return null

  const matchers = await askMatchers(
    { name, required: !context.only, suggestion: context.suggestion },
    ctx
  )
  if (matchers === null) return null

  return {
    name,
    ...(candidate.configDir !== undefined && {
      configDir: toHomeForm(candidate.configDir),
    }),
    codex,
    ...matchers,
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

// Asks which directories become profiles, then name, codex and matchers of
// each. Returns null when the user aborts (nothing is to be written then).
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
  const drafts: DraftProfile[] = []
  for (const candidate of picked) {
    const profile = await askProfile(
      candidate,
      { drafts, picked, suggestion, only },
      ctx
    )
    if (profile === null) return null
    drafts.push(profile)
  }

  const [first] = drafts
  if (only && first !== undefined) {
    return { profiles: drafts, onUnknown: first.name }
  }

  const onUnknown = await askOnUnknown(
    drafts.map(profile => profile.name),
    ctx
  )
  return onUnknown === null ? null : { profiles: drafts, onUnknown }
}

export default runWizard
