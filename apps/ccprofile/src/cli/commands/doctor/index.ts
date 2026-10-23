import type { ExitCode } from '../../../constants'
import type { Context } from '../../../context/types'
import { runDoctor } from '../../../doctor'

// Read-only health check; exit 1 if any check fails.
const doctor = (ctx: Context): Promise<ExitCode> => runDoctor(ctx)

export default doctor
