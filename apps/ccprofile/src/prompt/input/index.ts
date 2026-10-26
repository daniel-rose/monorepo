import inquirerInput from '@inquirer/input'

import type { Context } from '../../context/types'
import ask from '../ask'

type InputConfig = {
  message: string
  // Taken on Enter with an empty line.
  default?: string
  // true accepts the answer, a string is shown and asks again.
  validate?: (value: string) => true | string
}

// The trimmed answer, or null for Ctrl-C/Ctrl-D.
const input = (
  { message, default: preset, validate }: InputConfig,
  ctx: Context
): Promise<string | null> =>
  ask(ctx, context =>
    inquirerInput(
      {
        message,
        ...(preset !== undefined && { default: preset }),
        ...(validate !== undefined && {
          validate: (value: string) => validate(value.trim()),
        }),
      },
      context
    )
  ).then(answer => answer?.trim() ?? null)

export default input
