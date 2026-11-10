import { z } from 'zod'

import configDirText from '../configDirText'

// `{ "home": ... }`: a CODEX_HOME of a profile or an account.
const codexSchema = (description: string) =>
  z
    .strictObject({
      home: configDirText(
        'CODEX_HOME (`~` is expanded); must not be ~/.codex, the default. `ccprofile link` creates it.'
      ),
    })
    .describe(description)

export default codexSchema
