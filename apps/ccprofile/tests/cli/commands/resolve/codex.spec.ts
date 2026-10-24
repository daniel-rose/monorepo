import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import run from '../../../../src/cli'
import createSandbox from '../../../helpers/createSandbox'

const CODEX = ['resolve', '--protocol', '2', '--tool', 'codex']

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let workRepo = ''

beforeAll(async () => {
  sandbox = await createSandbox()
  workRepo = await sandbox.repo('w/app', 'git@gitlab.example.com:acme/app.git')
  sandbox.dir('.codex-work')
  sandbox.dir('.codex-work-2')
  await sandbox.writeConfig({
    profiles: [
      {
        name: 'work',
        configDir: '~/.claude-work',
        codex: { home: '~/.codex-work' },
        remotes: ['gitlab.example.com'],
        accounts: [
          {
            name: 'work-2',
            configDir: '~/.claude-work-2',
            codex: { home: '~/.codex-work-2' },
          },
        ],
      },
    ],
  })
})

afterAll(() => sandbox.cleanup())

describe('resolve --tool codex', () => {
  it('prints the CODEX_HOME of the first account', async () => {
    const ctx = sandbox.ctx(workRepo)

    const code = await run([...CODEX, '--', 'hi'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe(`work\t\t${join(sandbox.home, '.codex-work')}\t\n`)
  })

  it('prints account and CODEX_HOME of the selected account', async () => {
    const ctx = sandbox.ctx(workRepo, { CCPROFILE_ACCOUNT: 'work-2' })

    const code = await run([...CODEX, '--'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe(
      `work\twork-2\t${join(sandbox.home, '.codex-work-2')}\t\n`
    )
  })

  it('prints nothing for codex -V', async () => {
    const ctx = sandbox.ctx(workRepo)

    const code = await run([...CODEX, '--', '-V'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe('')
  })

  it('resolves claude without --tool', async () => {
    const ctx = sandbox.ctx(workRepo)

    const code = await run(['resolve', '--protocol', '2', '--', 'hi'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe(`work\t\t${join(sandbox.home, '.claude-work')}\t\n`)
  })

  it('rejects an unknown tool', async () => {
    const ctx = sandbox.ctx(workRepo)

    const code = await run(
      ['resolve', '--protocol', '2', '--tool', 'gemini', '--', 'hi'],
      ctx
    )

    expect(code).toBe(1)
    expect(ctx.out()).toBe('')
    expect(ctx.err()).toBe(
      'ccprofile: unsupported tool "gemini" – run "ccprofile setup"\n'
    )
  })
})
