import { INIT_PATTERN, INIT_TEXT } from '../../constants'
import type { Context } from '../../context/types'
import splitMatchers from '../../init/splitMatchers'
import validateMatchers from '../../init/validateMatchers'
import { input } from '../../prompt'
import type { DraftMatchers } from '../types'

type AskMatchersConfig = {
  name: string
  // false only for the profile that becomes `onUnknown`.
  required: boolean
  // Taken on Enter: the origin of the current repository, shortened.
  suggestion?: string
}

// Remotes and paths of a new profile in one comma-separated answer; null
// when the user aborts.
const askMatchers = async (
  { name, required, suggestion }: AskMatchersConfig,
  ctx: Context
): Promise<DraftMatchers | null> => {
  const answer = await input(
    {
      message: INIT_TEXT.matcherPrompt(name, required),
      default: suggestion,
      validate: value => validateMatchers(value, required, ctx),
    },
    ctx
  )
  if (answer === null) return null

  const entries = splitMatchers(answer)
  return {
    paths: entries.filter(entry => INIT_PATTERN.pathEntry.test(entry)),
    remotes: entries.filter(entry => !INIT_PATTERN.pathEntry.test(entry)),
  }
}

export default askMatchers
