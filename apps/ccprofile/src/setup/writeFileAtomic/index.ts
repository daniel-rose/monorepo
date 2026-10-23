import { randomBytes } from 'node:crypto'
import {
  chmod,
  lstat,
  mkdir,
  readFile,
  readlink,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'

import { CONFIG_FILE } from '../../constants'

const MODE_MASK = 0o7777
const TEMP_ATTEMPTS = 5
const TEMP_SUFFIX_BYTES = 6

const errorCode = (error: unknown): string | undefined =>
  error instanceof Error && 'code' in error ? String(error.code) : undefined

// Follows a symlink (even a dangling one) to the file that really gets written.
const resolveTarget = async (file: string): Promise<string> => {
  try {
    return await realpath(file)
  } catch (error) {
    if (errorCode(error) !== 'ENOENT') throw error
  }
  try {
    if ((await lstat(file)).isSymbolicLink()) {
      return resolve(dirname(file), await readlink(file))
    }
  } catch (error) {
    if (errorCode(error) !== 'ENOENT') throw error
  }
  return file
}

const readOld = async (
  target: string
): Promise<{ bom: boolean; mode: number | undefined }> => {
  try {
    const bytes = await readFile(target)
    return {
      bom: bytes.toString('utf8').startsWith(CONFIG_FILE.byteOrderMark),
      mode: (await stat(target)).mode & MODE_MASK,
    }
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return { bom: false, mode: undefined }
    throw error
  }
}

// Creates the temp file exclusively (`wx`: never follows or reuses a file that
// is already there), with a fresh random suffix if the name is taken.
const writeTemp = async (
  dir: string,
  name: string,
  text: string
): Promise<string> => {
  for (let attempt = 1; ; attempt += 1) {
    const suffix = randomBytes(TEMP_SUFFIX_BYTES).toString('hex')
    const temp = resolve(dir, `.${name}.${suffix}.tmp`)
    try {
      await writeFile(temp, text, { encoding: 'utf8', flag: 'wx' })
      return temp
    } catch (error) {
      if (errorCode(error) !== 'EEXIST' || attempt >= TEMP_ATTEMPTS) throw error
    }
  }
}

// Writes a temp file next to the target and renames it over it, so a reader
// never sees a half-written startup file. A symlink stays a symlink, the old
// file's UTF-8 byte order mark and permission bits are kept.
const writeFileAtomic = async (
  file: string,
  content: string
): Promise<void> => {
  const target = await resolveTarget(file)
  const dir = dirname(target)
  await mkdir(dir, { recursive: true })

  const old = await readOld(target)
  const text =
    old.bom && !content.startsWith(CONFIG_FILE.byteOrderMark)
      ? `${CONFIG_FILE.byteOrderMark}${content}`
      : content

  const temp = await writeTemp(dir, basename(target), text)
  try {
    if (old.mode !== undefined) await chmod(temp, old.mode)
    await rename(temp, target)
  } catch (error) {
    await rm(temp, { force: true })
    throw error
  }
}

export default writeFileAtomic
