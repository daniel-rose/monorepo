import type { Shell } from '../../../../constants'
import { TARGET_KIND } from '../../../../constants'
import type { Context } from '../../../../context/types'
import { getIntegrationTarget, hookFilePath } from '../../../../setup'
import type { CheckResult } from '../../../types'
import checkBlock from '../checkBlock'
import checkHookFile from '../checkHookFile'

// zsh, bash and fish: the integration point is known without running anything.
const checkShell = async (
  shell: Shell,
  ctx: Context
): Promise<CheckResult[]> => {
  const target = await getIntegrationTarget(shell, ctx)
  if (target.kind === TARGET_KIND.file) {
    return [await checkHookFile(shell, target.file)]
  }

  const hookFile = hookFilePath(shell, ctx)
  const block = await checkBlock(shell, target.file, hookFile, {
    requireFile: true,
  })
  return [
    await checkHookFile(shell, hookFile),
    ...(block === null ? [] : [block]),
  ]
}

export default checkShell
