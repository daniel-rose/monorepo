import { ON_UNKNOWN_PROMPT } from '../../constants'
import type { ResolvedConfig, ResolvedProfile } from '../types'

// The profile used when nothing matches although `onUnknown` is "prompt": a
// prompt with a single entry offers nothing to choose.
const onlyProfile = ({
  onUnknown,
  profiles,
}: ResolvedConfig): ResolvedProfile | undefined =>
  onUnknown === ON_UNKNOWN_PROMPT && profiles.length === 1
    ? profiles[0]
    : undefined

export default onlyProfile
