import { afterEach, expect, test, vi } from 'vitest'
import nativeFetchStrategy from '../../../../../src/react/EnvexProvider/utils/nativeFetchStrategy'

afterEach(() => {
  vi.restoreAllMocks()
})

test('Fetches the endpoint and returns the parsed JSON env.', async () => {
  const mockEnv = { API_URL: 'https://api.example.com' }
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(mockEnv),
  } as Response)

  const result = await nativeFetchStrategy('/api/env')

  expect(fetchSpy).toHaveBeenCalledWith('/api/env')
  expect(result).toEqual(mockEnv)
})

test('Rejects on a non-2xx response instead of parsing the body.', async () => {
  const jsonSpy = vi.fn()
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    ok: false,
    status: 500,
    statusText: 'Internal Server Error',
    json: jsonSpy,
  } as unknown as Response)

  await expect(nativeFetchStrategy('/api/env')).rejects.toThrow('500')
  expect(jsonSpy).not.toHaveBeenCalled()
})
