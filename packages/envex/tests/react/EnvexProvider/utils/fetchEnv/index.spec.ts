import { afterEach, expect, test, vi } from 'vitest'
import fetchEnv from '../../../../../src/react/EnvexProvider/utils/fetchEnv'
import resetFetchEnvCache from '../../../../../src/react/EnvexProvider/utils/resetFetchEnvCache'

afterEach(() => {
  resetFetchEnvCache()
  vi.restoreAllMocks()
})

test('Returns data on successful fetch.', async () => {
  const mockEnv = { API_URL: 'https://api.example.com' }

  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    json: () => Promise.resolve(mockEnv),
  } as Response)

  const result = await fetchEnv('/api/env')

  expect(result).toEqual(mockEnv)
})

test('Deduplicates: second call with same endpoint does not fetch again.', async () => {
  const mockEnv = { API_URL: 'https://api.example.com' }
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    json: () => Promise.resolve(mockEnv),
  } as Response)

  await fetchEnv('/api/env')
  await fetchEnv('/api/env')

  expect(fetchSpy).toHaveBeenCalledTimes(1)
})

test('Both calls receive the same data.', async () => {
  const mockEnv = { API_URL: 'https://api.example.com' }

  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    json: () => Promise.resolve(mockEnv),
  } as Response)

  const [result1, result2] = await Promise.all([
    fetchEnv('/api/env'),
    fetchEnv('/api/env'),
  ])

  expect(result1).toBe(result2)
})

test('Different endpoint invalidates cache and fetches again.', async () => {
  const mockEnv1 = { API_URL: 'https://api1.example.com' }
  const mockEnv2 = { API_URL: 'https://api2.example.com' }
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce({
      json: () => Promise.resolve(mockEnv1),
    } as Response)
    .mockResolvedValueOnce({
      json: () => Promise.resolve(mockEnv2),
    } as Response)

  const result1 = await fetchEnv('/api/env-1')
  const result2 = await fetchEnv('/api/env-2')

  expect(fetchSpy).toHaveBeenCalledTimes(2)
  expect(result1).toEqual(mockEnv1)
  expect(result2).toEqual(mockEnv2)
})

test('Error invalidates cache so next call retries.', async () => {
  const mockEnv = { API_URL: 'https://api.example.com' }
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockRejectedValueOnce(new Error('Network error'))
    .mockResolvedValueOnce({
      json: () => Promise.resolve(mockEnv),
    } as Response)

  await expect(fetchEnv('/api/env')).rejects.toThrow('Network error')

  const result = await fetchEnv('/api/env')

  expect(result).toEqual(mockEnv)
  expect(fetchSpy).toHaveBeenCalledTimes(2)
})
