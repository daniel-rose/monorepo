import inquirerSelect from '@inquirer/select'

import type { Context } from '../../context/types'
import ask from '../ask'
import type { Choice } from '../types'

type SelectConfig<Value> = {
  message: string
  choices: readonly Choice<Value>[]
  default?: Value
}

// One of the choices (arrow keys, a number key or the first letters jump),
// or null for Ctrl-C/Ctrl-D.
const select = <Value>(
  { message, choices, default: preset }: SelectConfig<Value>,
  ctx: Context
): Promise<Value | null> =>
  ask(ctx, context =>
    inquirerSelect<Value>(
      {
        message,
        choices,
        ...(preset !== undefined && { default: preset }),
        theme: { indexMode: 'number' },
      },
      context
    )
  )

export default select
