import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { Shell } from '../../constants'
import { HOOK_FILE, HOOK_FILE_EXTENSION } from '../../constants'
import findPackageRoot from '../../context/findPackageRoot'

// The hook files ship in the package root (`hooks/`), next to dist/.
const readHook = (shell: Shell): Promise<string> =>
  readFile(
    join(
      findPackageRoot(),
      HOOK_FILE.dirName,
      `${HOOK_FILE.baseName}.${HOOK_FILE_EXTENSION[shell]}`
    ),
    'utf8'
  )

export default readHook
