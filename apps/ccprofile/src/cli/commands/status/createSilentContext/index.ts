import { Writable } from 'node:stream'

import type { Context } from '../../../../context/types'

// `status` only reports; the informational stderr lines of resolveProfile
// (onUnknown, creating a profile) would repeat or contradict its one line.
const createSilentContext = (ctx: Context): Context => ({
  ...ctx,
  stderr: new Writable({ write: (_chunk, _encoding, done) => void done() }),
})

export default createSilentContext
