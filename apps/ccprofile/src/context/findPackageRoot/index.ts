import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_NAME = '@daniel-rose/ccprofile'

const isOwnPackage = (file: string): boolean => {
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'))
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as { name?: unknown }).name === PACKAGE_NAME
    )
  } catch {
    return false
  }
}

// Walks up from this module (src/ under vitest, dist/ when bundled) to the
// directory holding the package's own package.json.
const findPackageRoot = (): string => {
  let dir = dirname(fileURLToPath(import.meta.url))

  for (;;) {
    const candidate = join(dir, 'package.json')
    if (existsSync(candidate) && isOwnPackage(candidate)) {
      return dir
    }
    const parent = dirname(dir)
    if (parent === dir) {
      throw new Error(`Cannot locate the ${PACKAGE_NAME} package root`)
    }
    dir = parent
  }
}

export default findPackageRoot
