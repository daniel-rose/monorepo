import { readFile } from 'node:fs/promises'

import { SETUP_TEXT } from '../../constants'

// Byte order marks of UTF-16/UTF-32 (UTF-32LE starts like UTF-16LE).
const UNSUPPORTED_BOMS: readonly (readonly number[])[] = [
  [0xff, 0xfe],
  [0xfe, 0xff],
  [0x00, 0x00, 0xfe, 0xff],
]

const errorCode = (error: unknown): string =>
  error instanceof Error && 'code' in error ? String(error.code) : 'error'

const startsWith = (bytes: Uint8Array, prefix: readonly number[]): boolean =>
  prefix.every((byte, index) => bytes[index] === byte)

// Decodes a startup file. null: the file does not exist. A UTF-8 byte order
// mark is not part of the text (writeFileAtomic puts it back). Anything that is
// not valid UTF-8 throws: writing it back would corrupt the user's file.
const readText = async (file: string): Promise<string | null> => {
  let bytes: Buffer
  try {
    bytes = await readFile(file)
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return null
    throw new Error(SETUP_TEXT.cannotAccess(file, errorCode(error)), {
      cause: error,
    })
  }

  if (UNSUPPORTED_BOMS.some(bom => startsWith(bytes, bom))) {
    throw new Error(SETUP_TEXT.unsupportedEncoding(file))
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch (error) {
    throw new Error(SETUP_TEXT.unsupportedEncoding(file), { cause: error })
  }
}

export default readText
