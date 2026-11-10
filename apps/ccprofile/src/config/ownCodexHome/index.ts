import { CODEX_MODE } from '../../constants'
import type { ResolvedProfile } from '../types'

// The profile's own `codex.home`, if it has one; undefined says nothing
// about ~/.codex versus disabled (check `codex.mode` for that).
const ownCodexHome = ({ codex }: ResolvedProfile): string | undefined =>
  codex.mode === CODEX_MODE.home ? codex.home : undefined

export default ownCodexHome
