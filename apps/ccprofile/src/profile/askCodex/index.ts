import type { ProfileCodex } from '../../config'
import { CODEX_MODE, CONFIG_FILE, PROFILE_WIZARD_TEXT } from '../../constants'
import type { Context } from '../../context/types'
import { input, select } from '../../prompt'
import type { CodexMode } from '../types'

type AskCodexConfig = {
  name: string
  // Preselected: `disabled` once another profile uses ~/.codex.
  preset: CodexMode
  validateHome: (value: string) => true | string
}

const CHOICES = [
  {
    value: CODEX_MODE.disabled,
    name: PROFILE_WIZARD_TEXT.codexDisabled,
    description: PROFILE_WIZARD_TEXT.codexDisabledHint,
  },
  {
    value: CODEX_MODE.home,
    name: PROFILE_WIZARD_TEXT.codexHome,
    description: PROFILE_WIZARD_TEXT.codexHomeHint,
  },
  {
    value: CODEX_MODE.default,
    name: PROFILE_WIZARD_TEXT.codexDefault,
    description: PROFILE_WIZARD_TEXT.codexDefaultHint,
  },
] as const

// What `codex` gets in the new profile, its home in `~` form; null when the
// user aborts.
const askCodex = async (
  { name, preset, validateHome }: AskCodexConfig,
  ctx: Context
): Promise<ProfileCodex | null> => {
  const mode = await select<CodexMode>(
    {
      message: PROFILE_WIZARD_TEXT.codexPrompt(name),
      choices: CHOICES,
      default: preset,
    },
    ctx
  )
  if (mode === null) return null
  if (mode !== CODEX_MODE.home) return { mode }

  const home = await input(
    {
      message: PROFILE_WIZARD_TEXT.codexHomePrompt(name),
      default: `${CONFIG_FILE.homeMarker}/${CONFIG_FILE.codexDirName}-${name}`,
      validate: validateHome,
    },
    ctx
  )
  return home === null ? null : { mode, home }
}

export default askCodex
