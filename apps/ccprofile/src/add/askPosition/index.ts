import type { ResolvedConfig } from '../../config'
import { ADD_TEXT } from '../../constants'
import type { Context } from '../../context/types'
import { select } from '../../prompt'

// The index in `profiles` the new profile goes to: before an existing one
// or at the end (the default); null when the user aborts.
const askPosition = ({ profiles }: ResolvedConfig, ctx: Context) =>
  select<number>(
    {
      message: ADD_TEXT.positionPrompt,
      choices: [
        ...profiles.map((profile, index) => ({
          value: index,
          name: ADD_TEXT.before(profile.name),
        })),
        { value: profiles.length, name: ADD_TEXT.atEnd },
      ],
      default: profiles.length,
    },
    ctx
  )

export default askPosition
