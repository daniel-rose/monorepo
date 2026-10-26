import inquirerConfirm from '@inquirer/confirm'

import type { Context } from '../../context/types'
import ask from '../ask'

// y/N: false unless answered yes; Ctrl-C/Ctrl-D count as no.
const confirm = async (message: string, ctx: Context): Promise<boolean> =>
  (await ask(ctx, context =>
    inquirerConfirm({ message, default: false }, context)
  )) === true

export default confirm
