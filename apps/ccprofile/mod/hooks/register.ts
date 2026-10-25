import type { EngineInterface, Register } from 'claude-code'

import LIMITS_FILE from './LIMITS_FILE'
import limitsFile from './limitsFile'

// The config dir of the account this session runs on: CLAUDE_CONFIG_DIR as
// ccprofile set it, else ~/.claude (the first account of the default
// profile). USERPROFILE before HOME, as Node's os.homedir() on Windows.
const configDir = async ($: EngineInterface): Promise<string | undefined> => {
  const dir = await $.env.get('CLAUDE_CONFIG_DIR')
  if (dir !== undefined && dir !== '') return dir
  const home =
    (await $.env.get('USERPROFILE')) || (await $.env.get('HOME')) || undefined
  return home === undefined ? undefined : `${home}/${LIMITS_FILE.claudeDirName}`
}

// Records the rate-limit windows of every measurement in the account's own
// config dir, where `ccprofile resolve` reads them to pick the next
// session's account. Writes on every measurement with windows (not only when
// they moved), so a file left half written is replaced on the next turn.
// Observes only: a failed write never touches the session.
const register: Register = on => {
  on('session.measure', async ($, e, next) => {
    const result = await next(e)
    if (e.rateLimits.length === 0) return result

    try {
      const dir = await configDir($)
      if (dir !== undefined) {
        await $.fs.write(
          `${dir}/${LIMITS_FILE.dirName}/${LIMITS_FILE.fileName}`,
          JSON.stringify(limitsFile(await $.clock.now(), e.rateLimits))
        )
      }
    } catch {
      // Nothing to do: ccprofile treats a missing file as no data.
    }
    return result
  })
}

// The engine loads the named export `register`.
// eslint-disable-next-line no-restricted-syntax
export { register }
