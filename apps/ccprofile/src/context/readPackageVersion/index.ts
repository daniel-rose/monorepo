import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import findPackageRoot from '../findPackageRoot'

// Read at runtime: semantic-release bumps package.json after the build.
const readPackageVersion = (): string => {
  const pkg = JSON.parse(
    readFileSync(join(findPackageRoot(), 'package.json'), 'utf8')
  ) as { version: string }
  return pkg.version
}

export default readPackageVersion
