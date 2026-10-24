import type { ResolvedConfig, ResolvedProfile } from '../../../../config'
import { usesCodex } from '../../../../config'
import { LIST_TEXT } from '../../../../constants'

// The configDir is the first account; further accounts share its config.
const formatAccounts = ({ configDir, accounts }: ResolvedProfile): string[] =>
  accounts.length === 0
    ? []
    : [
        LIST_TEXT.sharedSource(configDir),
        ...accounts.map(account =>
          LIST_TEXT.account(account.name, account.configDir)
        ),
      ]

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

const formatList = (config: ResolvedConfig): string => {
  const withCodex = usesCodex(config)
  return [
    ...config.profiles.flatMap(profile => [
      LIST_TEXT.profile(profile.name),
      LIST_TEXT.configDir(profile.configDir),
      ...formatAccounts(profile),
      ...(withCodex ? formatCodex(profile) : []),
      ...profile.remotes.map(LIST_TEXT.remote),
      ...profile.paths.map(LIST_TEXT.path),
    ]),
    LIST_TEXT.onUnknown(config.onUnknown),
    '',
  ].join('\n')
}

export default formatList
