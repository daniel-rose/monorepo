import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import runInit from '../../../src/init/runInit'
import { checkbox, input, select } from '../../../src/prompt'
import createSandbox from '../../helpers/createSandbox'
import installFakeClaude from '../../helpers/installFakeClaude'

vi.mock('../../../src/prompt')

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let configPath = ''

beforeEach(async () => {
  sandbox = await createSandbox()
  configPath = join(sandbox.home, '.config', 'ccprofile', 'config.json')
  vi.mocked(checkbox).mockReset()
  vi.mocked(input).mockReset()
  vi.mocked(select).mockReset()
})

afterEach(() => sandbox.cleanup())

const ttyContext = (cwd: string) => {
  const stdin = Object.assign(new PassThrough(), { isTTY: true })
  const env = installFakeClaude(join(sandbox.home, '..'), 'loggedInEmail').env
  return { ...sandbox.ctx(cwd, env), stdin }
}

const prepareClaudeDirs = () => {
  writeFileSync(join(sandbox.home, '.claude.json'), '{}')
  writeFileSync(join(sandbox.dir('.claude-private'), '.claude.json'), '{}')
}

// The checkbox keeps the preselected choices, as Enter would.
const keepChecked = () =>
  vi
    .mocked(checkbox)
    .mockImplementationOnce(({ choices }) =>
      Promise.resolve(
        choices.filter(choice => choice.checked).map(choice => choice.value)
      )
    )

const answerInputs = (...answers: (string | null)[]) => {
  for (const answer of answers) vi.mocked(input).mockResolvedValueOnce(answer)
}

const inputConfig = (index: number) => {
  const config = vi.mocked(input).mock.calls[index]?.[0]
  if (config === undefined) throw new Error(`no input #${index}`)
  return config
}

const written = () => JSON.parse(readFileSync(configPath, 'utf8')) as unknown

describe('runInit wizard', () => {
  it('writes name, matchers and onUnknown of every picked directory', async () => {
    prepareClaudeDirs()
    const ctx = ttyContext(sandbox.dir('plain'))
    keepChecked()
    answerInputs(
      'default',
      'gitlab.example.com',
      'private',
      '~/Projects/private'
    )
    vi.mocked(select).mockResolvedValueOnce('prompt')

    const code = await runInit(ctx, { example: false })

    expect(code).toBe(0)
    expect(written()).toMatchObject({
      onUnknown: 'prompt',
      profiles: [
        { name: 'default', remotes: ['gitlab.example.com'] },
        {
          name: 'private',
          configDir: '~/.claude-private',
          paths: ['~/Projects/private'],
        },
      ],
    })
    expect(ctx.out()).toBe('no match (will prompt)\n')
  })

  it('offers each directory with its login, logged-in ones checked', async () => {
    prepareClaudeDirs()
    keepChecked()
    answerInputs(null)

    await runInit(ttyContext(sandbox.dir('plain')), { example: false })

    const choices = vi.mocked(checkbox).mock.calls[0]?.[0].choices
    expect(choices?.map(({ name, checked }) => ({ name, checked }))).toEqual([
      {
        name: '~/.claude (default): logged in as jane@example.test (max)',
        checked: true,
      },
      {
        name: '~/.claude-private: logged in as jane@example.test (max)',
        checked: true,
      },
    ])
  })

  it('suggests the directory name and rejects a name already taken', async () => {
    prepareClaudeDirs()
    keepChecked()
    answerInputs('default', 'gitlab.example.com', null)

    await runInit(ttyContext(sandbox.dir('plain')), { example: false })

    expect(inputConfig(0)).toMatchObject({
      message: 'Profile name for ~/.claude (default)',
      default: 'default',
    })
    expect(inputConfig(2).default).toBe('private')
    expect(inputConfig(2).validate?.('default')).toBe(
      '"default" is reserved, duplicate or invalid'
    )
  })

  it('requires matchers once there are several profiles', async () => {
    prepareClaudeDirs()
    keepChecked()
    answerInputs('default', null)

    await runInit(ttyContext(sandbox.dir('plain')), { example: false })

    expect(inputConfig(1).validate?.('')).toBe(
      'at least one remote or path is required'
    )
  })

  it('makes the only profile the onUnknown profile, matchers optional', async () => {
    writeFileSync(join(sandbox.home, '.claude.json'), '{}')
    const ctx = ttyContext(sandbox.dir('plain'))
    keepChecked()
    answerInputs('default', '')

    const code = await runInit(ctx, { example: false })

    expect(code).toBe(0)
    expect(inputConfig(1).message).toContain('(optional)')
    expect(inputConfig(1).validate?.('')).toBe(true)
    expect(select).not.toHaveBeenCalled()
    expect(written()).toMatchObject({
      onUnknown: 'default',
      profiles: [{ name: 'default' }],
    })
    expect(ctx.out()).toBe('default (onUnknown)\n')
  })

  it.each([
    [
      'git@gitlab.example.com:group/sub/app.git',
      'gitlab.example.com/group/sub',
    ],
    ['git@github.com:acme/app.git', 'github.com/acme'],
    ['git@example.test:app.git', 'example.test'],
  ])('suggests %s as %s', async (origin, expected) => {
    writeFileSync(join(sandbox.home, '.claude.json'), '{}')
    const repo = await sandbox.repo('w/app', origin)
    keepChecked()
    answerInputs('default', null)

    await runInit(ttyContext(repo), { example: false })

    expect(inputConfig(1).default).toBe(expected)
  })

  it('offers "prompt" and every profile for onUnknown', async () => {
    prepareClaudeDirs()
    keepChecked()
    answerInputs('default', 'gitlab.example.com', 'private', 'github.com/jane')
    vi.mocked(select).mockResolvedValueOnce('private')

    await runInit(ttyContext(sandbox.dir('plain')), { example: false })

    const config = vi.mocked(select).mock.calls[0]?.[0]
    expect(config?.default).toBe('prompt')
    expect(config?.choices.map(choice => choice.value)).toEqual([
      'prompt',
      'default',
      'private',
    ])
    expect(written()).toMatchObject({ onUnknown: 'private' })
  })

  it.each([
    {
      label: 'the directory choice',
      setup: () => vi.mocked(checkbox).mockResolvedValueOnce(null),
    },
    {
      label: 'a name',
      setup: () => {
        keepChecked()
        answerInputs(null)
      },
    },
    {
      label: 'onUnknown',
      setup: () => {
        keepChecked()
        answerInputs('default', 'gitlab.example.com', 'private', 'x.test')
        vi.mocked(select).mockResolvedValueOnce(null)
      },
    },
  ])('writes nothing when $label is cancelled', async ({ setup }) => {
    prepareClaudeDirs()
    const ctx = ttyContext(sandbox.dir('plain'))
    setup()

    const code = await runInit(ctx, { example: false })

    expect(code).toBe(1)
    expect(ctx.err()).toContain('ccprofile: aborted, nothing written')
    expect(() => readFileSync(configPath)).toThrow()
  })
})
