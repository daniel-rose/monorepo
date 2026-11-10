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
  // Enter on every select: the preset.
  vi.mocked(select).mockImplementation(({ default: preset }) =>
    Promise.resolve(preset ?? null)
  )
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

const answerSelects = (...answers: (string | null)[]) => {
  for (const answer of answers) vi.mocked(select).mockResolvedValueOnce(answer)
}

const selectConfig = (index: number) => {
  const config = vi.mocked(select).mock.calls[index]?.[0]
  if (config === undefined) throw new Error(`no select #${index}`)
  return config
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

    const code = await runInit(ctx, { example: false })

    expect(code).toBe(0)
    expect(written()).toEqual({
      $schema: expect.any(String) as string,
      onUnknown: 'prompt',
      profiles: [
        { name: 'default', remotes: ['gitlab.example.com'] },
        {
          name: 'private',
          configDir: '~/.claude-private',
          codex: false,
          paths: ['~/Projects/private'],
        },
      ],
    })
    expect(ctx.out()).toBe('no match (will prompt)\n')
  })

  it('keeps ~/.codex for the first profile and disables it for further ones', async () => {
    prepareClaudeDirs()
    keepChecked()
    answerInputs('default', 'x.test', 'private', 'y.test')

    await runInit(ttyContext(sandbox.dir('plain')), { example: false })

    expect(selectConfig(0)).toMatchObject({
      message: 'Codex CLI for default',
      default: 'default',
    })
    expect(selectConfig(1)).toMatchObject({
      message: 'Codex CLI for private',
      default: 'disabled',
    })
    expect(selectConfig(0).choices.map(choice => choice.value)).toEqual([
      'disabled',
      'home',
      'default',
    ])
  })

  it('writes an own codex home and refuses one already taken', async () => {
    prepareClaudeDirs()
    keepChecked()
    answerSelects('disabled', 'home')
    answerInputs('default', 'x.test', 'private', '~/.codex-private', 'y.test')

    await runInit(ttyContext(sandbox.dir('plain')), { example: false })

    const homeInput = inputConfig(3)
    expect(homeInput).toMatchObject({
      message: 'Codex home for private',
      default: '~/.codex-private',
    })
    expect(homeInput.validate?.('~/.claude-private')).toBe(
      '"~/.claude-private" is already used (by the config, ~/.claude or ~/.codex)'
    )
    expect(homeInput.validate?.('~/.codex')).toContain('already used')
    expect(homeInput.validate?.('rel')).toContain('not an absolute path')
    expect(written()).toMatchObject({
      profiles: [
        { name: 'default', codex: false },
        { name: 'private', codex: { home: '~/.codex-private' } },
      ],
    })
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
    // Only the codex question, no onUnknown question.
    expect(select).toHaveBeenCalledOnce()
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
    answerSelects('default', 'disabled', 'private')

    await runInit(ttyContext(sandbox.dir('plain')), { example: false })

    const config = selectConfig(2)
    expect(config.default).toBe('prompt')
    expect(config.choices.map(choice => choice.value)).toEqual([
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
      label: 'the codex choice',
      setup: () => {
        keepChecked()
        answerInputs('default')
        answerSelects(null)
      },
    },
    {
      label: 'the codex home',
      setup: () => {
        keepChecked()
        answerInputs('default', null)
        answerSelects('home')
      },
    },
    {
      label: 'onUnknown',
      setup: () => {
        keepChecked()
        answerInputs('default', 'gitlab.example.com', 'private', 'x.test')
        answerSelects('default', 'disabled', null)
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
