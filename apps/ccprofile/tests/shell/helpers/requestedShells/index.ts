import type { Shell } from '../../../../src/constants'
import isShell from '../../../../src/hook/isShell'
import TEST_ENV from '../../constants/TEST_ENV'

// The shells listed in CCPROFILE_TEST_SHELLS; a typo fails loudly instead of
// silently skipping a suite.
const requestedShells = (): Shell[] => {
  const names = (process.env[TEST_ENV.shells] ?? '')
    .split(',')
    .map(name => name.trim())
    .filter(name => name !== '')

  return names.map(name => {
    if (!isShell(name)) {
      throw new Error(`${TEST_ENV.shells}: unknown shell "${name}"`)
    }
    return name
  })
}

export default requestedShells
