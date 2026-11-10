import type { ResolvedConfig, ResolvedProfile } from '../../../config'
import { ownCodexHome, usesCodex } from '../../../config'
import {
  AUTH_STATE,
  AUTH_UNKNOWN_REASON,
  CHECK_STATUS,
  CODEX_MODE,
  DOCTOR_TEXT,
} from '../../../constants'
import type { Context } from '../../../context/types'
import formatAuth from '../../../init/formatAuth'
import fileExists from '../../fileExists'
import readCodexLogin from '../../readCodexLogin'
import type { Check, CheckResult } from '../../types'

const ENTRY = {
  home: 'home',
  fallback: 'fallback',
  disabled: 'disabled',
} as const

// A Codex home to check (`owner` null: ~/.codex, shared by every profile
// without codex.home), an account that uses the home of its profile, or a
// profile without codex (nothing to check).
type Entry =
  | { kind: typeof ENTRY.home; owner: string | null; dir: string | undefined }
  | { kind: typeof ENTRY.fallback | typeof ENTRY.disabled; owner: string }

const NOT_FOUND = 'notFound'

const usesCodexAnywhere = (profile: ResolvedProfile): boolean =>
  ownCodexHome(profile) !== undefined ||
  profile.accounts.some(account => account.codexHome !== undefined)

const isOnDefault = (profile: ResolvedProfile): boolean =>
  profile.codex.mode === CODEX_MODE.default

// The profile's own line: its Codex home, or that it has none.
const profileEntry = (profile: ResolvedProfile): Entry[] => {
  const owner = DOCTOR_TEXT.profileOwner(profile.name)
  if (profile.codex.mode === CODEX_MODE.disabled) {
    return [{ kind: ENTRY.disabled, owner }]
  }
  const dir = ownCodexHome(profile)
  return dir === undefined ? [] : [{ kind: ENTRY.home, owner, dir }]
}

// Every effective Codex home once, in config order; ~/.codex first.
const entriesOf = ({ profiles }: ResolvedConfig): Entry[] => [
  ...(profiles.some(isOnDefault)
    ? [{ kind: ENTRY.home, owner: null, dir: undefined }]
    : []),
  ...profiles.flatMap((profile): Entry[] => [
    ...profileEntry(profile),
    ...profile.accounts.flatMap((account): Entry[] => {
      const owner = DOCTOR_TEXT.accountOwner(profile.name, account.name)
      if (account.codexHome !== undefined) {
        return [{ kind: ENTRY.home, owner, dir: account.codexHome }]
      }
      return usesCodexAnywhere(profile) ? [{ kind: ENTRY.fallback, owner }] : []
    }),
  ]),
]

const checkHome = async (
  entry: Extract<Entry, { kind: typeof ENTRY.home }>,
  ctx: Context
): Promise<CheckResult | typeof NOT_FOUND> => {
  const { owner, dir } = entry
  if (owner !== null && dir !== undefined && !(await fileExists(dir))) {
    return {
      status: CHECK_STATUS.warn,
      message: DOCTOR_TEXT.codexHomeMissing(owner, dir),
    }
  }

  const auth = await readCodexLogin(dir, ctx)
  if (
    auth.state === AUTH_STATE.unknown &&
    auth.reason === AUTH_UNKNOWN_REASON.notFound
  ) {
    return NOT_FOUND
  }
  const state = formatAuth(auth)
  return {
    status:
      auth.state === AUTH_STATE.loggedIn ? CHECK_STATUS.ok : CHECK_STATUS.warn,
    message:
      owner === null
        ? DOCTOR_TEXT.codexDefaultLogin(state)
        : DOCTOR_TEXT.codexLogin(owner, state),
  }
}

// Several profiles on ~/.codex share one Codex login; worth a warning once
// another profile shows that separate homes are wanted (spec §4.2, P4).
const sharedDefault = ({ profiles }: ResolvedConfig): CheckResult[] => {
  const onDefault = profiles.filter(isOnDefault)
  return onDefault.length > 1 &&
    profiles.some(profile => ownCodexHome(profile) !== undefined)
    ? [
        {
          status: CHECK_STATUS.warn,
          message: DOCTOR_TEXT.codexSharedDefault(
            onDefault.map(({ name }) => name)
          ),
        },
      ]
    : []
}

// Login per effective Codex home (spec §4.3, P11), asked at once. A missing
// codex replaces all login lines with one warning; without any codex entry
// in the config the check stays silent.
const checkCodexLogin: Check = async (ctx, config) => {
  if (config === null || !usesCodex(config)) return []

  const lines = await Promise.all(
    entriesOf(config).map(async entry => {
      switch (entry.kind) {
        case ENTRY.fallback:
          return {
            status: CHECK_STATUS.ok,
            message: DOCTOR_TEXT.codexFromProfile(entry.owner),
          }
        case ENTRY.disabled:
          return {
            status: CHECK_STATUS.ok,
            message: DOCTOR_TEXT.codexDisabled(entry.owner),
          }
        case ENTRY.home:
          return checkHome(entry, ctx)
      }
    })
  )

  const missing = {
    status: CHECK_STATUS.warn,
    message: DOCTOR_TEXT.codexMissing,
  }
  const firstNotFound = lines.indexOf(NOT_FOUND)
  const results = lines.flatMap((line, index) => {
    if (line !== NOT_FOUND) return [line]
    return index === firstNotFound ? [missing] : []
  })
  return [...results, ...sharedDefault(config)]
}

export default checkCodexLogin
