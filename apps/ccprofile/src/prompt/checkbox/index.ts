import inquirerCheckbox from '@inquirer/checkbox'

import type { Context } from '../../context/types'
import ask from '../ask'
import type { Choice } from '../types'

type CheckboxConfig<Value> = {
  message: string
  // `checked` preselects a choice.
  choices: readonly Choice<Value>[]
}

// The checked choices, at least one (Enter with none asks again), or null
// for Ctrl-C/Ctrl-D.
const checkbox = <Value>(
  { message, choices }: CheckboxConfig<Value>,
  ctx: Context
): Promise<Value[] | null> =>
  ask(ctx, context =>
    inquirerCheckbox<Value>({ message, choices, required: true }, context)
  )

export default checkbox
