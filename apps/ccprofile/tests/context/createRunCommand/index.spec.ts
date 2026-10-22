import { describe, expect, it } from 'vitest'

import createRunCommand from '../../../src/context/createRunCommand'

const runCommand = createRunCommand('linux')
const node = process.execPath

describe('createRunCommand', () => {
  it('collects stdout, stderr and the exit code', async () => {
    const result = await runCommand(node, [
      '-e',
      'process.stdout.write("out");process.stderr.write("err");process.exit(3)',
    ])

    expect(result).toEqual({
      exitCode: 3,
      stdout: 'out',
      stderr: 'err',
      timedOut: false,
      notFound: false,
    })
  })

  it('reports notFound for a missing binary', async () => {
    const result = await runCommand('ccprofile-definitely-missing', [])

    expect(result.notFound).toBe(true)
    expect(result.exitCode).toBeNull()
    expect(result.stderr).not.toBe('')
  })

  it('reports timedOut for a sleeping child', async () => {
    const result = await runCommand(node, ['-e', 'setTimeout(()=>{},10000)'], {
      timeoutMs: 100,
    })

    expect(result.timedOut).toBe(true)
  })

  it('kills a child that ignores SIGTERM', async () => {
    const result = await runCommand(
      node,
      ['-e', 'process.on("SIGTERM",()=>{});setInterval(()=>{},1000)'],
      { timeoutMs: 200 }
    )

    expect(result.timedOut).toBe(true)
  })

  it('gives the child no stdin for input: ignore', async () => {
    const result = await runCommand(
      node,
      [
        '-e',
        'process.stdin.on("data",()=>{}).on("end",()=>process.stdout.write("eof"))',
      ],
      { input: 'ignore' }
    )

    expect(result.stdout).toBe('eof')
  })

  it('passes cwd and env to the child', async () => {
    const result = await runCommand(
      node,
      ['-e', 'process.stdout.write(process.env.CCPROFILE_TEST+process.cwd())'],
      { cwd: '/', env: { CCPROFILE_TEST: 'x' } }
    )

    expect(result.stdout).toBe('x/')
  })

  it('refuses unsafe arguments for .cmd on win32 without spawning', async () => {
    const result = await createRunCommand('win32')('claude.cmd', ['a&b'])

    expect(result).toEqual({
      exitCode: null,
      stdout: '',
      stderr: 'ccprofile: refusing to pass unsafe arguments to claude.cmd',
      timedOut: false,
      notFound: false,
    })
  })
})
