import { describe, expect, it } from 'vitest'

import buildBatchCommand from '../../../src/context/buildBatchCommand'

describe('buildBatchCommand', () => {
  it('runs the batch file through the given command interpreter', () => {
    expect(
      buildBatchCommand({
        executable: 'C:\\npm\\claude.cmd',
        args: ['--version'],
        comSpec: 'C:\\Windows\\System32\\cmd.exe',
      })
    ).toEqual({
      file: 'C:\\Windows\\System32\\cmd.exe',
      args: ['/d', '/s', '/c', '""C:\\npm\\claude.cmd" --version"'],
    })
  })

  it('falls back to cmd.exe without ComSpec', () => {
    expect(
      buildBatchCommand({
        executable: 'claude.cmd',
        args: [],
        comSpec: undefined,
      })?.file
    ).toBe('cmd.exe')
  })

  it('quotes an executable path with spaces and joins all arguments', () => {
    expect(
      buildBatchCommand({
        executable: 'C:\\Program Files\\npm\\claude.cmd',
        args: ['remote', 'get-url', 'origin'],
        comSpec: undefined,
      })?.args.at(-1)
    ).toBe('""C:\\Program Files\\npm\\claude.cmd" remote get-url origin"')
  })

  it.each([['a&b'], ['a b'], ['%PATH%'], ['$(x)'], ['a"b'], ['']])(
    'refuses the argument %j',
    arg => {
      expect(
        buildBatchCommand({
          executable: 'claude.cmd',
          args: [arg],
          comSpec: undefined,
        })
      ).toBeNull()
    }
  )

  it.each([['C:\\a%b\\claude.cmd'], ['C:\\a"b\\claude.cmd']])(
    'refuses the executable %j that cmd.exe would expand or split',
    executable => {
      expect(
        buildBatchCommand({ executable, args: [], comSpec: undefined })
      ).toBeNull()
    }
  )
})
