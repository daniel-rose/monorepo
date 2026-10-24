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

const failure = (
  target: string,
  error: unknown,
  platform: NodeJS.Platform
): LinkFailure => {
  const code = errorCode(error) ?? 'unknown error'
  return {
    target,
    unsupported: platform === 'win32' && code === 'EPERM',
    reason: code,
  }
}

// The dirs a plan needs; the first one that cannot be created is reported
// and the plan's links are skipped, the other plans still run.
const createDirs = async (
  dirs: readonly string[],
  platform: NodeJS.Platform
): Promise<LinkFailure | null> => {
  for (const dir of dirs) {
    try {
      await mkdir(dir, { recursive: true })
    } catch (error) {
      return failure(dir, error, platform)
    }
  }
  return null
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
    const dirFailure = await createDirs(
      [plan.account.configDir, ...plan.createSourceDirs],
      platform
    )
    if (dirFailure !== null) {
      failures.push(dirFailure)
      continue
    }

    for (const step of plan.steps) {
      if (step.kind !== LINK_STEP.create) continue
      const { entry, source, target } = step.inspection
      try {
        await symlink(source, target, linkType(entry, platform))
        created += 1
      } catch (error) {
        failures.push(failure(target, error, platform))
      }
    }
  }

  return { created, failures }
}

export default applyLinks
