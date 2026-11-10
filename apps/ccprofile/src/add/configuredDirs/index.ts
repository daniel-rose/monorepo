import type { ResolvedConfig } from '../../config'
import { ownCodexHome } from '../../config'

const present = (dir: string | undefined): string[] =>
  dir === undefined ? [] : [dir]

// Every directory the config already uses: configDir and codex.home of
// each profile and account (expanded).
const configuredDirs = ({ profiles }: ResolvedConfig): string[] =>
  profiles.flatMap(profile => [
    ...present(profile.configDir),
    ...present(ownCodexHome(profile)),
    ...profile.accounts.flatMap(account => [
      account.configDir,
      ...present(account.codexHome),
    ]),
  ])

export default configuredDirs
