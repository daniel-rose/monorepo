import { loadConfig } from '../../config'
import { ADD_TEXT, LOAD_STATUS, RESOLVE_MESSAGE } from '../../constants'
import type { Context } from '../../context/types'
import { readText } from '../../setup'
import type { ConfigSnapshot } from '../types'

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// The config `add` extends: it must exist and be valid. The text is read
// like `loadConfig` reads it (a UTF-8 byte order mark is dropped, and put
// back by writeFileAtomic). Returns the messages to fail with otherwise.
const readSnapshot = async (
  ctx: Context
): Promise<ConfigSnapshot | { errors: string[] }> => {
  const loaded = await loadConfig(ctx)
  const { path } = loaded
  if (loaded.status === LOAD_STATUS.missing) {
    return { errors: [ADD_TEXT.noConfig(path)] }
  }
  if (loaded.status === LOAD_STATUS.invalid) {
    return {
      errors: [
        RESOLVE_MESSAGE.invalidConfig(path),
        ...loaded.issues.map(RESOLVE_MESSAGE.issue),
      ],
    }
  }

  try {
    const text = await readText(path)
    const json: unknown = text === null ? null : JSON.parse(text)
    if (text === null || !isRecord(json)) {
      return { errors: [ADD_TEXT.changedMeanwhile(path)] }
    }
    return { path, text, json, config: loaded.config }
  } catch (error) {
    return { errors: [errorMessage(error)] }
  }
}

export default readSnapshot
