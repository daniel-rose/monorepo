import { lstat, readlink, realpath, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { ENTRY_KIND, ENTRY_STATE } from '../../constants'
import type { EntryInspection, SharedEntry } from '../types'

const inspectSource = async (
  source: string,
  entry: SharedEntry
): Promise<EntryInspection['sourceState']> => {
  try {
    const info = await stat(source)
    const fits =
      entry.kind === ENTRY_KIND.directory ? info.isDirectory() : info.isFile()
    return fits ? ENTRY_STATE.source.present : ENTRY_STATE.source.wrongKind
  } catch {
    return ENTRY_STATE.source.missing
  }
}

const sameRealpath = async (a: string, b: string): Promise<boolean> => {
  try {
    return (await realpath(a)) === (await realpath(b))
  } catch {
    return false
  }
}

// One shared entry of an account, inspected with lstat so a link is never
// followed by mistake. A link counts as correct when it names the source
// (relative targets resolved against the account dir) or resolves to it
// (Windows junctions).
const inspectEntry = async (
  entry: SharedEntry,
  sourceDir: string,
  accountDir: string
): Promise<EntryInspection> => {
  const source = resolve(sourceDir, entry.name)
  const target = resolve(accountDir, entry.name)
  const base = {
    entry,
    source,
    target,
    sourceState: await inspectSource(source, entry),
  }

  const info = await lstat(target).catch(() => null)
  if (info === null) return { ...base, targetState: ENTRY_STATE.target.absent }
  if (!info.isSymbolicLink()) {
    return {
      ...base,
      targetState: ENTRY_STATE.target.replaced,
      isDirectory: info.isDirectory(),
    }
  }

  const linkedTo = await readlink(target)
  if (
    resolve(dirname(target), linkedTo) === source ||
    (await sameRealpath(target, source))
  ) {
    return { ...base, targetState: ENTRY_STATE.target.linked }
  }
  return { ...base, targetState: ENTRY_STATE.target.elsewhere, linkedTo }
}

export default inspectEntry
