import { z } from 'zod'

import { CONFIG_REASON } from '../../../constants'
import codexSchema from '../codexSchema'

// The `codex` of a profile: its own CODEX_HOME, or `false` for none.
const profileCodexSchema = z
  .union(
    [
      codexSchema(
        'Codex CLI of this profile: the first Codex account and the shared Codex config of all accounts.'
      ),
      z
        .literal(false)
        .describe(
          'No Codex CLI in this profile: `codex` stops with exit 1 instead of falling back to ~/.codex. Its accounts must not have their own codex.'
        ),
    ],
    { error: CONFIG_REASON.badCodex }
  )
  .optional()
  .describe(
    'Codex CLI of this profile: `{ "home": ... }` for its own CODEX_HOME, `false` to disable codex here. Omit it to use ~/.codex.'
  )

export default profileCodexSchema
