import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

// Writes the config where ccprofile looks for it in the shell sandbox:
// %APPDATA%\ccprofile on Windows, $XDG_CONFIG_HOME/ccprofile elsewhere (both
// point into `home`, see createShellEnv).
const writeShellConfig = (home: string, config: unknown): void => {
  const path =
    process.platform === 'win32'
      ? join(home, 'AppData', 'Roaming', 'ccprofile', 'config.json')
      : join(home, '.config', 'ccprofile', 'config.json')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(config))
}

export default writeShellConfig
