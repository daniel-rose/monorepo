import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const { connection } = vi.hoisted(() => ({
  connection: vi.fn(() => Promise.resolve()),
}))

vi.mock('next/server', () => ({ connection }))

const { default: getPublicEnv } =
  await import('../../../../src/nextjs/utils/getPublicEnv')

beforeEach(() => {
  connection.mockClear()
  // Browser test env has no Node `process`; provide a minimal stub with a
  // public and a private key to exercise the NEXT_PUBLIC_ prefix filter.
  vi.stubGlobal('process', {
    env: {
      NEXT_PUBLIC_API_URL: 'https://api.example.test',
      SECRET_TOKEN: 'must-not-leak',
    },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('returns only public env and opts into dynamic rendering by default', async () => {
  const env = await getPublicEnv()

  expect(env).toEqual({ NEXT_PUBLIC_API_URL: 'https://api.example.test' })
  expect(connection).toHaveBeenCalledTimes(1)
})

test('returns the same public env without connection() when connection is false', async () => {
  const env = await getPublicEnv({ connection: false })

  expect(env).toEqual({ NEXT_PUBLIC_API_URL: 'https://api.example.test' })
  expect(connection).not.toHaveBeenCalled()
})
