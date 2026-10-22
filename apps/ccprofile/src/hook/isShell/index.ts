import type { Shell } from '../../constants'
import { SHELL } from '../../constants'

const SHELLS: readonly string[] = Object.values(SHELL)

const isShell = (name: string): name is Shell => SHELLS.includes(name)

export default isShell
