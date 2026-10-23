import { POSITIVE_ANSWER_PATTERN } from '../../constants'
import type { Context } from '../../context/types'
import createLineReader from '../createLineReader'

const confirm = async (question: string, ctx: Context): Promise<boolean> => {
  const reader = createLineReader(ctx)
  try {
    const line = await reader.readLine(question)
    return POSITIVE_ANSWER_PATTERN.test(line?.trim() ?? '')
  } finally {
    reader.close()
  }
}

export default confirm
