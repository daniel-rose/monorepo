import { expect, test } from 'vitest'
import filterPublicEnv from '../../../src/utils/filterPublicEnv'

const sampleEnv = {
  NEXT_PUBLIC_API_URL: 'https://api.example.com',
  NEXT_PUBLIC_APP_NAME: 'MyApp',
  SECRET_KEY: 'secret',
  APP_DEBUG: 'true',
}

test('filters only NEXT_PUBLIC_ prefixed keys by default', () => {
  const result = filterPublicEnv(sampleEnv)

  expect(result).toEqual({
    NEXT_PUBLIC_API_URL: 'https://api.example.com',
    NEXT_PUBLIC_APP_NAME: 'MyApp',
  })
})

test('returns all keys when prefix is null', () => {
  const result = filterPublicEnv(sampleEnv, null)

  expect(result).toEqual(sampleEnv)
})

test('filters by custom prefix', () => {
  const result = filterPublicEnv(sampleEnv, 'APP_')

  expect(result).toEqual({
    APP_DEBUG: 'true',
  })
})

test('returns empty object when no keys match', () => {
  const result = filterPublicEnv(sampleEnv, 'UNKNOWN_')

  expect(result).toEqual({})
})
