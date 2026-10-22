import type { ResolvedProfile } from '../../config/types'

// The single stdout line of `resolve`: `name<TAB>configDir` (spec §3).
const formatResolveLine = ({ name, configDir }: ResolvedProfile): string =>
  `${name}\t${configDir ?? ''}\n`

export default formatResolveLine
