import type { Shell } from '../../constants'
import { MARKER } from '../../constants'
import sourceLine from '../sourceLine'

// The marker block `setup` puts into a startup file (`\n` line breaks).
const buildBlock = (shell: Shell, hookFile: string): string =>
  [MARKER.start, sourceLine(shell, hookFile), MARKER.end].join('\n')

export default buildBlock
