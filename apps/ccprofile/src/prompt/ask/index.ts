import { PROMPT_CANCEL_ERROR } from '../../constants'
import type { Context } from '../../context/types'
import forwardOutput from '../forwardOutput'
import type { PromptContext } from '../types'

type Key = { name?: string; ctrl?: boolean }

const CANCEL_NAMES: readonly string[] = Object.values(PROMPT_CANCEL_ERROR)

const isCancel = (error: unknown): boolean =>
  error instanceof Error && CANCEL_NAMES.includes(error.name)

// Runs one inquirer prompt on the streams of the context. Returns null when
// it ends without an answer: Ctrl-C, or Ctrl-D, which inquirer leaves open
// (readline closes, the prompt never settles).
const ask = async <Value>(
  ctx: Context,
  run: (context: PromptContext) => Promise<Value>
): Promise<Value | null> => {
  const controller = new AbortController()
  const onKeypress = (_: unknown, key: Key | undefined) => {
    if (key?.ctrl === true && key.name === 'd') controller.abort()
  }
  ctx.stdin.on('keypress', onKeypress)

  try {
    return await run({
      input: ctx.stdin,
      output: forwardOutput(ctx.stderr),
      signal: controller.signal,
    })
  } catch (error) {
    if (isCancel(error)) return null
    throw error
  } finally {
    ctx.stdin.off('keypress', onKeypress)
  }
}

export default ask
