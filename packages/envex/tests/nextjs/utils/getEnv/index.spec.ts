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

// Guards the "build once, deploy many" contract: the reader must reflect the
// current process.env on every call, never a value frozen at import/build time.
test('reads the current process.env on each call (no frozen snapshot)', async () => {
  vi.stubGlobal('process', { env: { NEXT_PUBLIC_FOO: 'first' } })
  const first = await getEnv({ connection: false })
  expect(first['NEXT_PUBLIC_FOO']).toBe('first')

  vi.stubGlobal('process', { env: { NEXT_PUBLIC_FOO: 'second' } })
  const second = await getEnv({ connection: false })
  expect(second['NEXT_PUBLIC_FOO']).toBe('second')
})
