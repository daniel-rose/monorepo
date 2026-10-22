import { createInterface } from 'node:readline'

import type { Context } from '../../context/types'
import type { LineReader } from '../types'

// Lines are queued as readline emits them, so input that arrives before
// `readLine` is called (piped stdin, several lines per chunk) is not lost.
// Every end of input (EOF, Ctrl-C, close) yields `null`.
const createLineReader = (ctx: Context): LineReader => {
  const rl = createInterface({
    input: ctx.stdin,
    output: ctx.stderr,
    terminal: ctx.stdin.isTTY === true,
  })
  const queue: string[] = []
  const waiters: ((line: string | null) => void)[] = []
  let closed = false

  const finish = () => {
    closed = true
    waiters.splice(0).forEach(resolve => resolve(null))
  }

  rl.on('line', line => {
    const waiter = waiters.shift()
    if (waiter) {
      waiter(line)
    } else {
      queue.push(line)
    }
  })
  rl.on('close', finish)
  rl.on('SIGINT', () => rl.close())

  const readLine = (question: string) => {
    const queued = queue.shift()
    if (queued !== undefined) {
      ctx.stderr.write(question)
      return Promise.resolve(queued)
    }
    if (closed) {
      return Promise.resolve(null)
    }
    return new Promise<string | null>(resolve => {
      waiters.push(resolve)
      rl.setPrompt(question)
      rl.prompt()
    })
  }

  const close = () => {
    rl.close()
    ctx.stdin.pause()
  }

  return { readLine, close }
}

export default createLineReader
