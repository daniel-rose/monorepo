import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import readAuthStatus from '../../../src/init/readAuthStatus'
import createSandbox from '../../helpers/createSandbox'
import installFakeClaude from '../../helpers/installFakeClaude'

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let root = ''

beforeAll(async () => {
  sandbox = await createSandbox()
  root = join(sandbox.home, '..')
})

afterAll(() => sandbox.cleanup())

const statusFor = (
  mode: string,
  configDir: string | undefined,
  options?: { timeoutMs?: number }
) => {
  const fake = installFakeClaude(root, mode)
  const ctx = sandbox.ctx(sandbox.home, fake.env)
  return {
    log: fake.log,
    result: readAuthStatus(configDir, ctx, options),
  }
}

describe('readAuthStatus', () => {
  it('reports a login with email and subscription', async () => {
    const { result } = statusFor('loggedInEmail', '/x')

    expect(await result).toEqual({
      state: 'loggedIn',
      email: 'jane@example.test',
      subscriptionType: 'max',
    })
  })

  it('reports a login without optional fields', async () => {
    const { result } = statusFor('loggedIn', '/x')

    expect(await result).toEqual({ state: 'loggedIn' })
  })

  it('reports a logout (exit 1, loggedIn false)', async () => {
    const { result } = statusFor('loggedOut', '/x')

    expect(await result).toEqual({ state: 'loggedOut' })
  })

  it('reports a timeout', async () => {
    const { result } = statusFor('sleep', '/x', { timeoutMs: 100 })

    expect(await result).toEqual({ state: 'unknown', reason: 'timeout' })
  })

  it('reports garbage as unreadable', async () => {
    const { result } = statusFor('garbage', '/x')

    expect(await result).toEqual({ state: 'unknown', reason: 'unreadable' })
  })

  it('reports a missing claude binary', async () => {
    const empty = join(root, 'empty-bin')
    const ctx = sandbox.ctx(sandbox.home, { PATH: empty })

    expect(await readAuthStatus('/x', ctx)).toEqual({
      state: 'unknown',
      reason: 'notFound',
    })
  })

  it('sets CLAUDE_CONFIG_DIR for a profile directory', async () => {
    const { result, log } = statusFor('loggedIn', '/some/dir')
    await result

    expect(readFileSync(log, 'utf8')).toBe('CLAUDE_CONFIG_DIR=/some/dir\n')
  })

  it('removes CLAUDE_CONFIG_DIR for the default candidate', async () => {
    const fake = installFakeClaude(root, 'loggedIn-default')
    const ctx = sandbox.ctx(sandbox.home, {
      ...fake.env,
      FAKE_AUTH_MODE: 'loggedIn',
      CLAUDE_CONFIG_DIR: '/leaked',
    })

    await readAuthStatus(undefined, ctx)

    expect(readFileSync(fake.log, 'utf8')).toBe('CLAUDE_CONFIG_DIR=absent\n')
  })
})
