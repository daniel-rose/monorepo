import type { ExitCode } from '../../../constants'
import type { Context } from '../../../context/types'

export type SetupOptions = { yes?: boolean; remove?: boolean }

// Injectable so tests can stub the init step.
export type SetupDeps = {
  runInit: (ctx: Context, options: { example: boolean }) => Promise<ExitCode>
}
