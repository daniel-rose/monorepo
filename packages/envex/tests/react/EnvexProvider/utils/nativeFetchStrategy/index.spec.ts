import { afterEach, expect, test, vi } from 'vitest'
import nativeFetchStrategy from '../../../../../src/react/EnvexProvider/utils/nativeFetchStrategy'

afterEach(() => {
  vi.restoreAllMocks()
})

test('Fetches the endpoint and returns the parsed JSON env.', async () => {
  const mockEnv = { API_URL: 'https://api.example.com' }
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    json: () => Promise.resolve(mockEnv),
  } as Response)

  const result = await nativeFetchStrategy('/api/env')

  expect(fetchSpy).toHaveBeenCalledWith('/api/env')
  expect(result).toEqual(mockEnv)
})
