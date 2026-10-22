import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import loadConfig from '../../../src/config/loadConfig'
import type { Context } from '../../../src/context/types'
import createTestContext from '../../helpers/createTestContext'

let root = ''
let home = ''
let counter = 0

beforeAll(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'ccprofile-config-')))
  home = join(root, 'home')
  mkdirSync(home)
  writeFileSync(join(home, 'a-file'), '')
  mkdirSync(join(home, 'real-dir'))
  symlinkSync(join(home, 'real-dir'), join(home, 'link-dir'))
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

const writeConfig = (content: unknown): string => {
  counter += 1
  const file = join(root, `config-${counter}`, 'config.json')
  mkdirSync(join(root, `config-${counter}`))
  writeFileSync(
    file,
    typeof content === 'string' ? content : JSON.stringify(content)
  )
  return file
}

const createContext = (
  file: string,
  overrides: Partial<Context> = {}
): Context =>
  createTestContext({
    homedir: home,
    env: { CCPROFILE_CONFIG: file },
    ...overrides,
  })

const load = (content: unknown, overrides: Partial<Context> = {}) =>
  loadConfig(createContext(writeConfig(content), overrides))

const issuesOf = async (content: unknown): Promise<string[]> => {
  const result = await load(content)
  if (result.status !== 'invalid') {
    throw new Error(`expected invalid, got ${result.status}`)
  }
  return result.issues
}

describe('loadConfig', () => {
  describe('valid', () => {
    it('loads the spec example with expanded paths and normalized remotes', async () => {
      const file = writeConfig({
        $schema: 'https://unpkg.com/@daniel-rose/ccprofile@1/schema.json',
        onUnknown: 'prompt',
        passthrough: ['--version'],
        profiles: [
          {
            name: 'work',
            remotes: ['gitlab.example.com', 'git@github.com:acme/app.git'],
          },
          {
            name: 'private',
            configDir: '~/.claude-private',
            remotes: ['https://GitHub.com/jane/'],
            paths: ['~/Projects/private'],
          },
        ],
      })

      const result = await loadConfig(createContext(file))

      expect(result).toEqual({
        status: 'ok',
        path: file,
        config: {
          schema: 'https://unpkg.com/@daniel-rose/ccprofile@1/schema.json',
          onUnknown: 'prompt',
          passthrough: ['--version'],
          profiles: [
            {
              name: 'work',
              configDir: undefined,
              paths: [],
              remotes: ['gitlab.example.com', 'github.com/acme/app'],
            },
            {
              name: 'private',
              configDir: join(home, '.claude-private'),
              paths: [join(home, 'Projects', 'private')],
              remotes: ['github.com/jane'],
            },
          ],
        },
      })
    })

    it('applies the defaults', async () => {
      const result = await load({ profiles: [work] })

      expect(result).toMatchObject({
        status: 'ok',
        config: {
          onUnknown: 'prompt',
          passthrough: ['--version', '-v', '--help', '-h', 'update'],
          schema: undefined,
        },
      })
    })

    it('accepts a UTF-8 BOM', async () => {
      const result = await load(`\uFEFF${JSON.stringify({ profiles: [work] })}`)

      expect(result.status).toBe('ok')
    })

    it('accepts an onUnknown profile without matchers', async () => {
      const result = await load({
        onUnknown: 'fallback',
        profiles: [work, { name: 'fallback', configDir: '/p/fallback' }],
      })

      expect(result.status).toBe('ok')
    })

    it('accepts a configDir that is an existing directory', async () => {
      const result = await load({
        profiles: [{ ...work, configDir: '~/real-dir' }],
      })

      expect(result.status).toBe('ok')
    })

    it('expands ~/Projects on win32 with the win32 path rules', async () => {
      const file = writeConfig({
        profiles: [
          {
            name: 'private',
            configDir: '~/.claude-private',
            paths: ['~/Projects', 'D:\\code\\..\\work'],
          },
        ],
      })

      const result = await loadConfig(
        createContext(file, { platform: 'win32', homedir: 'C:\\Users\\jane' })
      )

      expect(result).toMatchObject({
        status: 'ok',
        config: {
          profiles: [
            {
              configDir: 'C:\\Users\\jane\\.claude-private',
              paths: ['C:\\Users\\jane\\Projects', 'D:\\work'],
            },
          ],
        },
      })
    })
  })

  describe('file state', () => {
    it('reports a missing file', async () => {
      const file = join(root, 'nowhere', 'config.json')

      expect(await loadConfig(createContext(file))).toEqual({
        status: 'missing',
        path: file,
      })
    })

    it('reads the location given by CCPROFILE_CONFIG', async () => {
      const file = writeConfig({ profiles: [work] })

      const result = await loadConfig(
        createTestContext({
          homedir: home,
          env: { CCPROFILE_CONFIG: file, XDG_CONFIG_HOME: join(root, 'x') },
        })
      )

      expect(result).toMatchObject({ status: 'ok', path: file })
    })

    it('reads <XDG_CONFIG_HOME>/ccprofile/config.json', async () => {
      const xdg = join(root, 'xdg')
      mkdirSync(join(xdg, 'ccprofile'), { recursive: true })
      writeFileSync(
        join(xdg, 'ccprofile', 'config.json'),
        JSON.stringify({ profiles: [work] })
      )

      const result = await loadConfig(
        createTestContext({
          homedir: home,
          env: { CCPROFILE_CONFIG: '', XDG_CONFIG_HOME: xdg },
        })
      )

      expect(result).toMatchObject({
        status: 'ok',
        path: join(xdg, 'ccprofile', 'config.json'),
      })
    })

    it('reports a JSONC comment as invalid JSON without a stack trace', async () => {
      const result = await load('{\n  // comment\n  "profiles": []\n}')

      expect(result.status).toBe('invalid')
      const issues = (result as { issues: string[] }).issues
      expect(issues).toHaveLength(1)
      expect(issues[0]).toMatch(/^config\.json: invalid JSON \(.+\)$/)
      expect(issues[0]).not.toContain('    at ')
    })

    it('reports a trailing comma as invalid JSON', async () => {
      const result = await load('{"profiles": [],}')

      expect(result).toMatchObject({
        status: 'invalid',
        issues: [expect.stringMatching(/^config\.json: invalid JSON \(/)],
      })
    })

    it('reports an unreadable path instead of throwing', async () => {
      const result = await loadConfig(createContext(root))

      expect(result).toMatchObject({
        status: 'invalid',
        issues: [
          expect.stringMatching(/^ccprofile-config-.*: cannot read file/),
        ],
      })
    })

    it('reports a non-object root', async () => {
      expect(await issuesOf([])).toEqual([
        'config.json: Invalid input: expected object, received array',
      ])
    })
  })

  describe('rules', () => {
    it.each<[string, unknown, string]>([
      [
        'unknown key',
        { profiles: [{ ...work, remote: 'x' }] },
        'profiles[0].remote: unknown key',
      ],
      [
        'unknown top-level key',
        { profiles: [work], onunknown: 'x' },
        'onunknown: unknown key',
      ],
      [
        'empty string',
        { profiles: [work, { ...priv, remotes: [''] }] },
        'profiles[1].remotes[0]: must not be empty',
      ],
      [
        'whitespace-only string',
        { profiles: [{ ...work, paths: ['   '] }] },
        'profiles[0].paths[0]: must not be empty',
      ],
      [
        'wrong type',
        { profiles: [{ ...work, remotes: 'github.com' }] },
        'profiles[0].remotes: Invalid input: expected array, received string',
      ],
      [
        'duplicate name',
        { profiles: [work, { ...priv, name: 'work' }] },
        'profiles[1].name: duplicate name "work"',
      ],
      [
        'reserved name',
        { profiles: [{ ...work, name: 'prompt' }] },
        'profiles[0].name: "prompt" is reserved',
      ],
      [
        'bad name',
        { profiles: [{ ...work, name: 'a b' }] },
        'profiles[0].name: must match [A-Za-z0-9_.-]+',
      ],
      [
        'unknown onUnknown',
        { onUnknown: 'missing', profiles: [work] },
        'onUnknown: must be "prompt" or the name of a profile',
      ],
      [
        'two profiles without configDir',
        { profiles: [work, { name: 'b', remotes: ['github.com/b'] }] },
        'profiles[1].configDir: only one profile may omit configDir',
      ],
      [
        'relative configDir',
        { profiles: [{ ...work, configDir: 'rel/dir' }] },
        'profiles[0].configDir: must be an absolute path',
      ],
      [
        'configDir with a TAB',
        { profiles: [{ ...work, configDir: '/p/a\tb' }] },
        'profiles[0].configDir: must not contain TAB or line breaks',
      ],
      [
        'configDir equal after resolve',
        {
          profiles: [
            { ...work, configDir: '/p/a' },
            { ...priv, configDir: '/p/../p/a' },
          ],
        },
        'profiles[1].configDir: same directory as profiles[0]',
      ],
      [
        'configDir equal via symlink',
        {
          profiles: [
            { ...work, configDir: '~/real-dir' },
            { ...priv, configDir: '~/link-dir' },
          ],
        },
        'profiles[1].configDir: same directory as profiles[0]',
      ],
      [
        'configDir ~/.claude',
        { profiles: [{ ...work, configDir: '~/.claude' }] },
        'profiles[0].configDir: must not be ~/.claude (omit configDir for the default profile)',
      ],
      [
        'configDir ~/.claude spelled differently',
        { profiles: [{ ...work, configDir: '~/x/../.claude/' }] },
        'profiles[0].configDir: must not be ~/.claude (omit configDir for the default profile)',
      ],
      [
        'configDir pointing at a file',
        { profiles: [{ ...work, configDir: '~/a-file' }] },
        'profiles[0].configDir: exists but is not a directory',
      ],
      [
        'relative paths entry',
        { profiles: [{ ...work, paths: ['.'] }] },
        'profiles[0].paths[0]: must be an absolute path',
      ],
      [
        'remote without host',
        { profiles: [{ ...work, remotes: ['../repo.git'] }] },
        'profiles[0].remotes[0]: has no host',
      ],
      [
        'profile without matchers',
        { profiles: [work, { name: 'b', configDir: '/p/b' }] },
        'profiles[1]: needs at least one entry in paths or remotes',
      ],
      [
        'no profiles',
        { profiles: [] },
        'profiles: must contain at least one profile',
      ],
    ])('rejects %s', async (_label, content, expected) => {
      expect(await issuesOf(content)).toEqual([expected])
    })

    it('collects the issues of several profiles', async () => {
      expect(
        await issuesOf({
          profiles: [
            { ...work, configDir: 'rel' },
            { ...priv, paths: ['.'] },
          ],
        })
      ).toEqual([
        'profiles[0].configDir: must be an absolute path',
        'profiles[1].paths[0]: must be an absolute path',
      ])
    })

    it('compares configDirs case-insensitively on darwin and win32 only', async () => {
      const profiles = [
        { ...work, configDir: '/p/Claude' },
        { ...priv, configDir: '/p/claude' },
      ]

      expect((await load({ profiles }, { platform: 'darwin' })).status).toBe(
        'invalid'
      )
      expect((await load({ profiles }, { platform: 'linux' })).status).toBe(
        'ok'
      )
    })
  })
})
