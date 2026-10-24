import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import loadConfig from '../../../src/config/loadConfig'
import createTestContext from '../../helpers/createTestContext'

let root = ''
let home = ''
let counter = 0

beforeAll(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'ccprofile-codex-config-')))
  home = join(root, 'home')
  mkdirSync(home)
  writeFileSync(join(home, 'a-file'), '')
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

const work = { name: 'work', remotes: ['github.com/acme'] }
const priv = {
  name: 'private',
  configDir: '~/.claude-private',
  paths: ['~/Projects/private'],
}
const seat = { name: 'seat-2', configDir: '/p/seat-2' }

const load = (content: unknown) => {
  counter += 1
  const dir = join(root, `config-${counter}`)
  mkdirSync(dir)
  const file = join(dir, 'config.json')
  writeFileSync(file, JSON.stringify(content))
  return loadConfig(
    createTestContext({ homedir: home, env: { CCPROFILE_CONFIG: file } })
  )
}

const issuesOf = async (content: unknown): Promise<string[]> => {
  const result = await load(content)
  if (result.status !== 'invalid') {
    throw new Error(`expected invalid, got ${result.status}`)
  }
  return result.issues
}

describe('loadConfig with codex', () => {
  it('expands codex.home of profiles and accounts', async () => {
    const result = await load({
      profiles: [
        {
          ...priv,
          codex: { home: '~/.codex-private' },
          accounts: [
            { ...seat, codex: { home: '~/.codex-private-2' } },
            { name: 'seat-3', configDir: '/p/seat-3' },
          ],
        },
      ],
    })

    expect(result).toMatchObject({
      status: 'ok',
      config: {
        profiles: [
          {
            codexHome: join(home, '.codex-private'),
            accounts: [
              { name: 'seat-2', codexHome: join(home, '.codex-private-2') },
              { name: 'seat-3', codexHome: undefined },
            ],
          },
        ],
      },
    })
  })

  it('leaves codexHome unset without a codex entry', async () => {
    const result = await load({ profiles: [work] })

    expect(result).toMatchObject({
      status: 'ok',
      config: { profiles: [{ codexHome: undefined }] },
    })
  })

  it('accepts an account codex home on a profile without one', async () => {
    const result = await load({
      profiles: [
        { ...work, accounts: [{ ...seat, codex: { home: '/p/codex-2' } }] },
      ],
    })

    expect(result).toMatchObject({
      status: 'ok',
      config: {
        profiles: [
          { codexHome: undefined, accounts: [{ codexHome: '/p/codex-2' }] },
        ],
      },
    })
  })

  it.each<[string, unknown, string]>([
    [
      'unknown codex key',
      { profiles: [{ ...work, codex: { home: '/p/c', dir: '/p/c' } }] },
      'profiles[0].codex.dir: unknown key',
    ],
    [
      'codex without home',
      { profiles: [{ ...work, codex: {} }] },
      'profiles[0].codex.home: Invalid input: expected string, received undefined',
    ],
    [
      'relative codex.home',
      { profiles: [{ ...work, codex: { home: 'rel' } }] },
      'profiles[0].codex.home: must be an absolute path',
    ],
    [
      'codex.home with a TAB',
      { profiles: [{ ...work, codex: { home: '/p/a\tb' } }] },
      'profiles[0].codex.home: must not contain TAB or line breaks',
    ],
    [
      'codex.home ~/.codex',
      { profiles: [{ ...work, codex: { home: '~/.codex' } }] },
      'profiles[0].codex.home: must not be ~/.codex, the default (omit codex instead)',
    ],
    [
      'account codex.home ~/.codex',
      {
        profiles: [
          { ...priv, accounts: [{ ...seat, codex: { home: '~/.codex/' } }] },
        ],
      },
      'profiles[0].accounts[0].codex.home: must not be ~/.codex, the default (omit codex instead)',
    ],
    [
      'codex.home ~/.claude',
      { profiles: [{ ...work, codex: { home: '~/.claude' } }] },
      'profiles[0].codex.home: must not be ~/.claude',
    ],
    [
      'configDir ~/.codex',
      { profiles: [{ ...work, configDir: '~/.codex' }] },
      'profiles[0].configDir: must not be ~/.codex',
    ],
    [
      'codex.home pointing at a file',
      { profiles: [{ ...work, codex: { home: '~/a-file' } }] },
      'profiles[0].codex.home: exists but is not a directory',
    ],
    [
      'codex.home equal to the configDir of its profile',
      { profiles: [{ ...priv, codex: { home: '~/.claude-private' } }] },
      'profiles[0].codex.home: same directory as profiles[0]',
    ],
    [
      'codex.home equal to another codex.home',
      {
        profiles: [
          { ...work, codex: { home: '/p/codex' } },
          { ...priv, codex: { home: '/p/codex' } },
        ],
      },
      'profiles[1].codex.home: same directory as profiles[0].codex',
    ],
    [
      'account codex.home equal to the profile codex.home',
      {
        profiles: [
          {
            ...priv,
            codex: { home: '/p/codex' },
            accounts: [{ ...seat, codex: { home: '/p/codex' } }],
          },
        ],
      },
      'profiles[0].accounts[0].codex.home: same directory as profiles[0].codex',
    ],
    [
      'configDir equal to an earlier codex.home',
      {
        profiles: [
          { ...work, codex: { home: '/p/shared' } },
          { ...priv, configDir: '/p/shared' },
        ],
      },
      'profiles[1].configDir: same directory as profiles[0].codex',
    ],
  ])('rejects %s', async (_label, content, expected) => {
    expect(await issuesOf(content)).toEqual([expected])
  })
})
