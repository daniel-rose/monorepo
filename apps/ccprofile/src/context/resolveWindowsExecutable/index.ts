import { win32 } from 'node:path'

const DEFAULT_PATHEXT = '.COM;.EXE;.BAT;.CMD'

type ResolveWindowsExecutableInput = {
  file: string
  path: string
  pathext?: string
  isFile: (path: string) => boolean
}

// cmd.exe semantics: a name that already has an extension is tried as-is; a
// bare name only gets the PATHEXT extensions, so the extensionless sh shim
// that npm places next to `claude.cmd` is never picked.
const resolveWindowsExecutable = ({
  file,
  path,
  pathext,
  isFile,
}: ResolveWindowsExecutableInput): string | null => {
  const suffixes = win32.extname(file)
    ? ['']
    : (pathext || DEFAULT_PATHEXT).split(';').filter(Boolean)

  for (const dir of path.split(';').filter(Boolean)) {
    for (const suffix of suffixes) {
      const candidate = win32.join(dir, file + suffix)
      if (isFile(candidate)) {
        return candidate
      }
    }
  }
  return null
}

export default resolveWindowsExecutable
