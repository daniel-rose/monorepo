import { afterEach, expect, test, vi } from 'vitest'
import fetchEnv from '../../../../../src/react/EnvexProvider/utils/fetchEnv'
import resetFetchEnvCache from '../../../../../src/react/EnvexProvider/utils/resetFetchEnvCache'

afterEach(() => {
  resetFetchEnvCache()
  vi.restoreAllMocks()
})

test('resetFetchEnvCache clears the cache.', async () => {
  const mockEnv = { API_URL: 'https://api.example.com' }
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce({
      json: () => Promise.resolve(mockEnv),
    } as Response)
    .mockResolvedValueOnce({
      json: () => Promise.resolve(mockEnv),
    } as Response)

  await fetchEnv('/api/env')
  resetFetchEnvCache()
  await fetchEnv('/api/env')

  expect(fetchSpy).toHaveBeenCalledTimes(2)
})
