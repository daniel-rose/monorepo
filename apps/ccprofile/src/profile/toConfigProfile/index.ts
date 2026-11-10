import { CODEX_MODE } from '../../constants'
import type { DraftProfile } from '../types'

// A draft as a config entry: empty `paths`/`remotes` and the default codex
// stay out of the file, `codex: false` stays in.
const toConfigProfile = (profile: DraftProfile) => ({
  name: profile.name,
  ...(profile.configDir !== undefined && { configDir: profile.configDir }),
  ...(profile.codex.mode === CODEX_MODE.home && {
    codex: { home: profile.codex.home },
  }),
  ...(profile.codex.mode === CODEX_MODE.disabled && { codex: false }),
  ...(profile.remotes.length > 0 && { remotes: profile.remotes }),
  ...(profile.paths.length > 0 && { paths: profile.paths }),
})

export default toConfigProfile
