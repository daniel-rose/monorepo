import type { ResolvedConfig, ResolvedProfile } from '../../../../config'
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

const formatList = ({ profiles, onUnknown }: ResolvedConfig): string =>
  [
    ...profiles.flatMap(profile => [
      LIST_TEXT.profile(profile.name),
      LIST_TEXT.configDir(profile.configDir),
      ...formatAccounts(profile),
      ...profile.remotes.map(LIST_TEXT.remote),
      ...profile.paths.map(LIST_TEXT.path),
    ]),
    LIST_TEXT.onUnknown(onUnknown),
    '',
  ].join('\n')

export default formatList
