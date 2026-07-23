import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const { connection } = vi.hoisted(() => ({
  connection: vi.fn(() => Promise.resolve()),
}))

vi.mock('next/server', () => ({ connection }))

const { default: getPublicEnvByName } =
  await import('../../../../src/nextjs/utils/getPublicEnvByName')

beforeEach(() => {
  connection.mockClear()
  // Browser test env has no Node `process`; provide a minimal stub.
  vi.stubGlobal('process', {
    env: { NEXT_PUBLIC_WEBSHOP_API_BASE_URL: 'https://api.example.test' },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('opts into dynamic rendering via connection() by default', async () => {
  const value = await getPublicEnvByName('NEXT_PUBLIC_WEBSHOP_API_BASE_URL')

  expect(value).toBe('https://api.example.test')
  expect(connection).toHaveBeenCalledTimes(1)
})

test('reads the runtime value without connection() when connection is false', async () => {
  const value = await getPublicEnvByName('NEXT_PUBLIC_WEBSHOP_API_BASE_URL', {
    connection: false,
  })

  expect(value).toBe('https://api.example.test')
  expect(connection).not.toHaveBeenCalled()
})
