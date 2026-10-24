import { mkdir, symlink } from 'node:fs/promises'

import { ENTRY_KIND, LINK_STEP } from '../../constants'
import type {
  AccountPlan,
  ApplyResult,
  LinkFailure,
  SharedEntry,
} from '../types'

const errorCode = (error: unknown): string | undefined =>
  error instanceof Error && 'code' in error ? String(error.code) : undefined

// Windows: directories as junctions (no privilege needed), files as
// symlinks (need Developer Mode or admin). Elsewhere the type is ignored.
const linkType = (entry: SharedEntry, platform: NodeJS.Platform) => {
  if (platform !== 'win32') return undefined
  return entry.kind === ENTRY_KIND.directory ? 'junction' : 'file'
}

// Creates the missing dirs, then the links. Never removes or overwrites: an
// entry that appeared since planning fails with EEXIST and is reported.
const applyLinks = async (
  plans: readonly AccountPlan[],
  platform: NodeJS.Platform
): Promise<ApplyResult> => {
  let created = 0
  const failures: LinkFailure[] = []

  for (const plan of plans) {
    await mkdir(plan.account.configDir, { recursive: true })
    for (const dir of plan.createSourceDirs) {
      await mkdir(dir, { recursive: true })
    }

    for (const step of plan.steps) {
      if (step.kind !== LINK_STEP.create) continue
      const { entry, source, target } = step.inspection
      try {
        await symlink(source, target, linkType(entry, platform))
        created += 1
      } catch (error) {
        const code = errorCode(error) ?? 'unknown error'
        failures.push({
          target,
          unsupported: platform === 'win32' && code === 'EPERM',
          reason: code,
        })
      }
    }
  }

  return { created, failures }
}

export default applyLinks
