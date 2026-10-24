import { Writable } from 'node:stream'

import type { Context } from '../types'

// A context whose stderr goes nowhere. `status` only reports, and `resolve`
// for a v1 hook only fails: the informational stderr lines of resolveProfile
// (onUnknown, creating a profile) would repeat or contradict their message.
const createSilentContext = (ctx: Context): Context => ({
  ...ctx,
  stderr: new Writable({ write: (_chunk, _encoding, done) => void done() }),
})

export default createSilentContext
