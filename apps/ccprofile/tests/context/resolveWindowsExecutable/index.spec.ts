import { describe, expect, it } from 'vitest'

import resolveWindowsExecutable from '../../../src/context/resolveWindowsExecutable'

const PATH = 'C:\\bin;C:\\npm'

const filesOf =
  (...files: string[]) =>
  (path: string) =>
    files.some(file => file.toLowerCase() === path.toLowerCase())

describe('resolveWindowsExecutable', () => {
  it('skips the extensionless shim and finds the .cmd', () => {
    const result = resolveWindowsExecutable({
      file: 'claude',
      path: PATH,
      pathext: '.COM;.EXE;.BAT;.CMD',
      isFile: filesOf('C:\\npm\\claude', 'C:\\npm\\claude.cmd'),
    })

    expect(result).toBe('C:\\npm\\claude.CMD')
  })

  it('tries a name with an extension as-is', () => {
    const result = resolveWindowsExecutable({
      file: 'claude.exe',
      path: PATH,
      isFile: filesOf('C:\\bin\\claude.exe', 'C:\\bin\\claude.exe.exe'),
    })

    expect(result).toBe('C:\\bin\\claude.exe')
  })

  it('respects the PATHEXT order', () => {
    const isFile = filesOf('C:\\bin\\claude.cmd', 'C:\\bin\\claude.exe')

    expect(
      resolveWindowsExecutable({
        file: 'claude',
        path: PATH,
        pathext: '.CMD;.EXE',
        isFile,
      })
    ).toBe('C:\\bin\\claude.CMD')
    expect(
      resolveWindowsExecutable({
        file: 'claude',
        path: PATH,
        pathext: '.EXE;.CMD',
        isFile,
      })
    ).toBe('C:\\bin\\claude.EXE')
  })

  it('prefers earlier PATH directories', () => {
    const result = resolveWindowsExecutable({
      file: 'claude',
      path: PATH,
      isFile: filesOf('C:\\bin\\claude.exe', 'C:\\npm\\claude.cmd'),
    })

    expect(result).toBe('C:\\bin\\claude.EXE')
  })

  it('returns null when nothing matches', () => {
    const result = resolveWindowsExecutable({
      file: 'claude',
      path: PATH,
      isFile: filesOf('C:\\npm\\claude'),
    })

    expect(result).toBeNull()
  })
})
