import type { ResolvedConfig, ResolvedProfile } from '../../../../config'
import { onlyProfile, usesCodex } from '../../../../config'
import { LIMITS_STATUS, LIST_TEXT } from '../../../../constants'
import type { AccountLimits } from '../../../../limits'
import { formatReading } from '../../../../limits'
import type { ProfileLimits } from '../types'

// Once any account of the profile has a limit file, every account (the
// first one too) shows its last reading; without the mod nothing changes.
const formatLimits = (limits: readonly AccountLimits[], now: number) =>
  limits.map(({ account, reading }) =>
    LIST_TEXT.accountLimits(
      LIST_TEXT.account(account.name, account.configDir),
      formatReading(reading, now)
    )
  )

// The configDir is the first account; further accounts share its config.
const formatAccounts = (
  { configDir, accounts }: ResolvedProfile,
  limits: readonly AccountLimits[] = [],
  now: number
): string[] => {
  if (accounts.length === 0) return []
  const hasLimits = limits.some(
    ({ reading }) => reading.status !== LIMITS_STATUS.missing
  )
  return [
    LIST_TEXT.sharedSource(configDir),
    ...(hasLimits
      ? formatLimits(limits, now)
      : accounts.map(account =>
          LIST_TEXT.account(account.name, account.configDir)
        )),
  ]
}

// Once any profile uses codex, every profile shows its Codex home (so
// profiles sharing ~/.codex are visible), then where each account's comes
// from: its own, the profile's, or ~/.codex.
const formatCodex = ({ codexHome, accounts }: ResolvedProfile): string[] => [
  LIST_TEXT.codex(codexHome),
  ...accounts.map(account =>
    LIST_TEXT.codexAccount(
      account.name,
      account.codexHome ??
        (codexHome === undefined
          ? LIST_TEXT.codexDefault
          : LIST_TEXT.codexFromProfile)
    )
  ),
]

const formatOnUnknown = (config: ResolvedConfig): string => {
  const only = onlyProfile(config)
  return only === undefined
    ? LIST_TEXT.onUnknown(config.onUnknown)
    : LIST_TEXT.onUnknownOnlyProfile(config.onUnknown, only.name)
}

const formatList = (
  config: ResolvedConfig,
  limits: ProfileLimits,
  now: number
): string => {
  const withCodex = usesCodex(config)
  return [
    ...config.profiles.flatMap(profile => [
      LIST_TEXT.profile(profile.name),
      LIST_TEXT.configDir(profile.configDir),
      ...formatAccounts(profile, limits.get(profile.name), now),
      ...(withCodex ? formatCodex(profile) : []),
      ...profile.remotes.map(LIST_TEXT.remote),
      ...profile.paths.map(LIST_TEXT.path),
    ]),
    formatOnUnknown(config),
    '',
  ].join('\n')
}

export default formatList
