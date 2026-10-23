import { loadConfig } from '../../../config'
import type { ExitCode } from '../../../constants'
import {
  EXIT_CODE,
  LOAD_STATUS,
  RESOLVE_MESSAGE,
  STATUS_TEXT,
} from '../../../constants'
import type { Context } from '../../../context/types'
import failWith from '../failWith'
import formatList from './formatList'

// Profiles in match order with configDir, paths and remotes, then `onUnknown`.
const list = async (ctx: Context): Promise<ExitCode> => {
  const loaded = await loadConfig(ctx)

  switch (loaded.status) {
    case LOAD_STATUS.missing:
      ctx.stdout.write(`${STATUS_TEXT.noProfiles(loaded.path)}\n`)
      return EXIT_CODE.ok
    case LOAD_STATUS.invalid:
      return failWith(ctx, [
        RESOLVE_MESSAGE.invalidConfig(loaded.path),
        ...loaded.issues.map(RESOLVE_MESSAGE.issue),
      ])
    case LOAD_STATUS.ok:
      ctx.stdout.write(formatList(loaded.config))
      return EXIT_CODE.ok
  }
}

export default list
