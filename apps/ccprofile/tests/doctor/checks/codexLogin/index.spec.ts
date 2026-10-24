import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { RunCommandResult } from '../../../../src/context/types'
import checkCodexLogin from '../../../../src/doctor/checks/codexLogin'
import createConfig from '../../../helpers/createConfig'
import createSandbox from '../../../helpers/createSandbox'
import createTestContext from '../../../helpers/createTestContext'

const result = (overrides: Partial<RunCommandResult>): RunCommandResult => ({
  exitCode: 0,
  stdout: '',
  stderr: '',
  timedOut: false,
  notFound: false,
  ...overrides,
})

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let privateHome = ''
let seatHome = ''
let calls: (string | undefined)[] = []

// `codex login status` answers per CODEX_HOME (undefined: ~/.codex).
const contextFor = (answer: (home: string | undefined) => RunCommandResult) =>
  createTestContext({
    homedir: sandbox.home,
    runCommand: (_file, _args, options) => {
      const home = options?.env?.CODEX_HOME
      calls.push(home)
      return Promise.resolve(answer(home))
    },
  })

const privateConfig = () =>
  createConfig([
    {
      name: 'private',
      codexHome: privateHome,
      accounts: [
        { name: 'seat-2', configDir: '/p/c2', codexHome: seatHome },
        { name: 'seat-3', configDir: '/p/c3' },
      ],
    },
  ])

beforeEach(async () => {
  sandbox = await createSandbox()
  privateHome = sandbox.dir('.codex-private')
  seatHome = sandbox.dir('.codex-private-2')
  calls = []
})

afterEach(() => sandbox.cleanup())

describe('checkCodexLogin', () => {
  it('does nothing without a config or without codex', async () => {
    const ctx = contextFor(() => result({}))

    expect(await checkCodexLogin(ctx, null)).toEqual([])
    expect(await checkCodexLogin(ctx, createConfig([{ name: 'w' }]))).toEqual(
      []
    )
    expect(calls).toEqual([])
  })

  it('checks every codex home once and names the fallback', async () => {
    const ctx = contextFor(home =>
      home === seatHome ? result({ exitCode: 1 }) : result({})
    )

    expect(await checkCodexLogin(ctx, privateConfig())).toEqual([
      { status: 'ok', message: 'profile private: codex logged in' },
      {
        status: 'warn',
        message: 'profile private, account seat-2: codex not logged in',
      },
      {
        status: 'ok',
        message: 'profile private, account seat-3: codex from profile',
      },
    ])
    expect(calls.sort()).toEqual([privateHome, seatHome].sort())
  })

  it('checks ~/.codex once without CODEX_HOME', async () => {
    const ctx = contextFor(() => result({}))
    const config = createConfig([
      { name: 'work' },
      { name: 'private', codexHome: privateHome },
    ])

    expect(await checkCodexLogin(ctx, config)).toEqual([
      { status: 'ok', message: 'codex ~/.codex (default): logged in' },
      { status: 'ok', message: 'profile private: codex logged in' },
    ])
    expect(calls).toContain(undefined)
  })

  it('reports a missing codex home instead of its login', async () => {
    const missing = join(sandbox.home, '.codex-missing')
    const ctx = contextFor(() => result({}))
    const config = createConfig([{ name: 'private', codexHome: missing }])

    expect(await checkCodexLogin(ctx, config)).toEqual([
      {
        status: 'warn',
        message: `profile private: codex home ${missing} does not exist – run ccprofile link`,
      },
    ])
    expect(calls).toEqual([])
  })

  it('warns once when codex is not on the PATH', async () => {
    const ctx = contextFor(() => result({ notFound: true }))

    expect(await checkCodexLogin(ctx, privateConfig())).toEqual([
      { status: 'warn', message: 'codex not found on PATH' },
      {
        status: 'ok',
        message: 'profile private, account seat-3: codex from profile',
      },
    ])
  })

  it('warns about an unknown login state', async () => {
    const ctx = contextFor(() => result({ timedOut: true }))
    const config = createConfig([{ name: 'private', codexHome: privateHome }])

    expect(await checkCodexLogin(ctx, config)).toEqual([
      {
        status: 'warn',
        message: 'profile private: codex login state unknown (timeout)',
      },
    ])
  })

  it('warns when several profiles share ~/.codex next to an own home', async () => {
    const ctx = contextFor(() => result({}))
    const config = createConfig([
      { name: 'work' },
      { name: 'client' },
      { name: 'private', codexHome: privateHome },
    ])

    expect(await checkCodexLogin(ctx, config)).toContainEqual({
      status: 'warn',
      message:
        'profiles work, client share ~/.codex – give each its own codex.home',
    })
  })
})
