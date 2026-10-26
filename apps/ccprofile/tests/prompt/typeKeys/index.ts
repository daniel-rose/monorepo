import { setTimeout as delay } from 'node:timers/promises'

// Types one key per tick: inquirer validates asynchronously after Enter and
// drops keys that arrive meanwhile.
const KEY_INTERVAL_MS = 5

const typeKeys = async (
  stdin: NodeJS.WritableStream,
  keys: readonly string[]
): Promise<void> => {
  for (const key of keys) {
    await delay(KEY_INTERVAL_MS)
    stdin.write(key)
  }
}

export default typeKeys
