import { afterEach, beforeEach, expect, test, vi } from 'vitest'

// getEnv imports `connection` from next/server; mock it so the test can assert
// whether the dynamic-rendering opt-in is invoked.
const { connection } = vi.hoisted(() => ({
  connection: vi.fn(() => Promise.resolve()),
}))

vi.mock('next/server', () => ({ connection }))

const { default: getEnv } = await import('../../../../src/nextjs/utils/getEnv')

beforeEach(() => {
  connection.mockClear()
  // Browser test env has no Node `process`; provide a minimal stub.
  vi.stubGlobal('process', { env: { NEXT_PUBLIC_FOO: 'bar' } })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('opts into dynamic rendering via connection() by default', async () => {
  await getEnv()

  expect(connection).toHaveBeenCalledTimes(1)
})

test('skips connection() when connection is false', async () => {
  await getEnv({ connection: false })

  expect(connection).not.toHaveBeenCalled()
})
