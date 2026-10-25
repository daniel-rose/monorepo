import { homedir } from 'node:os'

import createRunCommand from '../createRunCommand'
import type { Context } from '../types'

const createContext = (): Context => ({
  cwd: process.cwd(),
  env: process.env,
  platform: process.platform,
  homedir: homedir(),
  now: Date.now,
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr,
  runCommand: createRunCommand(process.platform),
})

export default createContext
