import { PassThrough, Writable } from 'node:stream'

import type { Context } from '../../../src/context/types'

const createSink = () => {
  let buffer = ''
  const stream = new Writable({
    write: (chunk: Buffer | string, _encoding, callback) => {
      buffer += chunk.toString()
      callback()
    },
  })
  return { stream, read: () => buffer }
}

const createTestContext = (
  overrides: Partial<Context> = {}
): Context & { out: () => string; err: () => string } => {
  const out = createSink()
  const err = createSink()

  return {
    cwd: '/work/project',
    env: {},
    platform: 'linux',
    homedir: '/home/jane',
    now: Date.now,
    stdin: new PassThrough(),
    stdout: out.stream,
    stderr: err.stream,
    runCommand: () =>
      Promise.resolve({
        exitCode: 0,
        stdout: '',
        stderr: '',
        timedOut: false,
        notFound: true,
      }),
    ...overrides,
    out: out.read,
    err: err.read,
  }
}

export default createTestContext
