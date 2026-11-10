import { z } from 'zod'

import { CONFIG_PATTERN, CONFIG_REASON } from '../../../constants'
import codexSchema from '../codexSchema'
import configDirText from '../configDirText'

// A further login of a profile.
const accountSchema = z
  .strictObject({
    name: z
      .string()
      .regex(CONFIG_PATTERN.name, CONFIG_REASON.badName)
      .describe(
        'Account name: unique within the profile and different from the profile name; selects this account through the CCPROFILE_ACCOUNT variable.'
      ),
    configDir: configDirText(
      'CLAUDE_CONFIG_DIR of this account (its own login); `~` is expanded. `ccprofile link` links the shared config of the profile into it.'
    ),
    codex: codexSchema(
      'Codex CLI login of this account. `ccprofile link` links the Codex config of the profile into it. Omit it to use the Codex home of the profile.'
    ).optional(),
  })
  .describe(
    'A further login of the profile. It shares the config of the profile configDir.'
  )

export default accountSchema
