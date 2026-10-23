import type { ResolvedConfig } from '../../../../config'
import { LIST_TEXT } from '../../../../constants'

const formatList = ({ profiles, onUnknown }: ResolvedConfig): string =>
  [
    ...profiles.flatMap(profile => [
      LIST_TEXT.profile(profile.name),
      LIST_TEXT.configDir(profile.configDir),
      ...profile.remotes.map(LIST_TEXT.remote),
      ...profile.paths.map(LIST_TEXT.path),
    ]),
    LIST_TEXT.onUnknown(onUnknown),
    '',
  ].join('\n')

export default formatList
