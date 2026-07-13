import type { StandardSchemaV1 } from '@standard-schema/spec'
import { expect, test } from 'vitest'
import { EnvexValidationError } from '../../../src/errors'
import { validateEnv } from '../../../src/utils/validateEnv'

const makePassSchema = <TOut>(
  transform: (v: unknown) => TOut
): StandardSchemaV1<unknown, TOut> => ({
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: v => ({ value: transform(v) }),
  },
})

const makeFailSchema = (message: string): StandardSchemaV1<unknown, never> => ({
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: () => ({ issues: [{ message }] }),
  },
})

const makeAsyncPassSchema = <TOut>(
  transform: (v: unknown) => TOut
): StandardSchemaV1<unknown, TOut> => ({
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: v => Promise.resolve({ value: transform(v) }),
  },
})

const makeAsyncFailSchema = (
  message: string
): StandardSchemaV1<unknown, never> => ({
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: () => Promise.resolve({ issues: [{ message }] }),
  },
})

test('returns parsed value when sync schema passes', async () => {
  const input = { NEXT_PUBLIC_API_URL: 'https://api.example.com' }
  const schema = makePassSchema(v => v as typeof input)

  const result = await validateEnv(schema, input)

  expect(result).toEqual(input)
})

test('throws EnvexValidationError when sync schema fails', async () => {
  const schema = makeFailSchema('Required')

  await expect(validateEnv(schema, {})).rejects.toBeInstanceOf(
    EnvexValidationError
  )
})

test('includes issue messages in error', async () => {
  expect.assertions(4)
  const schema = makeFailSchema('API_URL is required')

  try {
    await validateEnv(schema, {})
  } catch (error) {
    expect(error).toBeInstanceOf(EnvexValidationError)
    if (error instanceof EnvexValidationError) {
      expect(error.issues).toHaveLength(1)
      expect(error.issues[0].message).toBe('API_URL is required')
      expect(error.message).toContain('API_URL is required')
    }
  }
})

test('returns parsed value when async schema passes', async () => {
  const input = { NEXT_PUBLIC_X: 'hello' }
  const schema = makeAsyncPassSchema(v => v as typeof input)

  const result = await validateEnv(schema, input)

  expect(result).toEqual(input)
})

test('throws EnvexValidationError when async schema fails', async () => {
  const schema = makeAsyncFailSchema('Invalid')

  await expect(validateEnv(schema, {})).rejects.toBeInstanceOf(
    EnvexValidationError
  )
})

test('schema can transform value', async () => {
  const input = { COUNT: '42' }
  const schema = makePassSchema(() => ({ COUNT: 42 }))

  const result = await validateEnv(schema, input)

  expect(result).toEqual({ COUNT: 42 })
})
