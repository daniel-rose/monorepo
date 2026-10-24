import { mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { SHARED_ENTRY } from '../../../../src/constants'
import checkAccountLinks from '../../../../src/doctor/checks/accountLinks'
import createConfig from '../../../helpers/createConfig'
import createSandbox from '../../../helpers/createSandbox'

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let source = ''
let account = ''

const configOf = () =>
  createConfig([
    {
      name: 'private',
      configDir: source,
      accounts: [{ name: 'seat-2', configDir: account }],
    },
  ])

// Links every shared entry whose source exists, as `link` would.
const linkAll = (): void => {
  mkdirSync(account, { recursive: true })
  for (const { name } of SHARED_ENTRY) {
    symlinkSync(join(source, name), join(account, name))
  }
}

beforeEach(async () => {
  sandbox = await createSandbox()
  source = sandbox.dir('.claude-private')
  account = join(sandbox.home, '.claude-private-2')
  for (const { name, kind } of SHARED_ENTRY) {
    if (kind === 'directory') mkdirSync(join(source, name))
    else writeFileSync(join(source, name), '')
  }
})

afterEach(() => sandbox.cleanup())

describe('checkAccountLinks', () => {
  it('does nothing without a config or without accounts', async () => {
    const ctx = sandbox.ctx(sandbox.home)

    expect(await checkAccountLinks(ctx, null)).toEqual([])
    expect(
      await checkAccountLinks(ctx, createConfig([{ name: 'work' }]))
    ).toEqual([])
  })

  it('names the shared source and reports intact links once', async () => {
    linkAll()

    const results = await checkAccountLinks(
      sandbox.ctx(sandbox.home),
      configOf()
    )

    expect(results).toEqual([
      { status: 'ok', message: `profile private: shared source ${source}` },
      { status: 'ok', message: 'profile private, account seat-2: links ok' },
    ])
  })

  it('names ~/.claude as the shared source of the default profile', async () => {
    const config = createConfig([
      { name: 'work', accounts: [{ name: 'work-2', configDir: account }] },
    ])

    const [first] = await checkAccountLinks(sandbox.ctx(sandbox.home), config)

    expect(first?.message).toBe(
      'profile work: shared source ~/.claude (default)'
    )
  })

  it('warns once when the account dir does not exist', async () => {
    const results = await checkAccountLinks(
      sandbox.ctx(sandbox.home),
      configOf()
    )

    expect(results[1]).toEqual({
      status: 'warn',
      message: `profile private, account seat-2: ${account} does not exist – run ccprofile link`,
    })
    expect(results).toHaveLength(2)
  })

  it('reports each broken entry and the sources that are missing', async () => {
    linkAll()
    const settings = join(account, 'settings.json')
    const skills = join(account, 'skills')
    const rules = join(account, 'rules')
    rmSync(settings)
    writeFileSync(settings, '{}')
    rmSync(skills)
    symlinkSync(sandbox.dir('elsewhere'), skills)
    rmSync(rules)
    rmSync(join(source, 'CLAUDE.md'))

    const results = await checkAccountLinks(
      sandbox.ctx(sandbox.home),
      configOf()
    )

    expect(results.slice(1)).toEqual([
      {
        status: 'warn',
        message: `profile private, account seat-2: ${settings} replaced by a file – merge it into ${join(source, 'settings.json')}, delete it, run ccprofile link`,
      },
      {
        status: 'warn',
        message: `profile private, account seat-2: ${rules} missing – run ccprofile link`,
      },
      {
        status: 'warn',
        message: `profile private, account seat-2: ${skills} points elsewhere (${join(sandbox.home, 'elsewhere')})`,
      },
      {
        status: 'ok',
        message: 'profile private, account seat-2: no source for CLAUDE.md',
      },
    ])
  })
})
