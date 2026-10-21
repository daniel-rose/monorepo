import { expect, expectTypeOf, test } from 'vitest'
import {
  EnvexCredentialLeakError,
  EnvexProviderIsMissingError,
  EnvexScriptIsMissingError,
  EnvexValidationError,
  EnvexWindowEnvIsMissingError,
  useEnv,
  type CredentialFinding,
  type Env,
  type StandardSchemaV1,
} from '../src'

type Schema = StandardSchemaV1<unknown, { PORT: number }>

test('useEnv keeps both overloads', () => {
  expectTypeOf(useEnv).toEqualTypeOf<{
    (): Env
    <TSchema extends StandardSchemaV1>(): StandardSchemaV1.InferOutput<TSchema>
  }>()

  // Hooks are only type-checked here, never called.
  const useRawEnv = () => useEnv()
  const useSchemaEnv = () => useEnv<Schema>()
  // @ts-expect-error -- the type argument must be a schema
  const useUndefinedEnv = () => useEnv<undefined>()

  expectTypeOf(useRawEnv).returns.toEqualTypeOf<Env>()
  expectTypeOf(useSchemaEnv).returns.toEqualTypeOf<{ PORT: number }>()
  expectTypeOf(useUndefinedEnv).toBeFunction()
})

test('error classes keep their hierarchy', () => {
  expect(new EnvexWindowEnvIsMissingError()).toBeInstanceOf(
    EnvexScriptIsMissingError
  )
  expect(new EnvexScriptIsMissingError()).toBeInstanceOf(Error)
  expect(new EnvexProviderIsMissingError()).toBeInstanceOf(Error)
  expect(new EnvexCredentialLeakError([])).toBeInstanceOf(Error)
  expect(new EnvexValidationError([])).toBeInstanceOf(Error)
})

test('error classes keep their constructor signatures', () => {
  expectTypeOf(EnvexCredentialLeakError).constructorParameters.toEqualTypeOf<
    [findings: CredentialFinding[]]
  >()
  expectTypeOf(EnvexValidationError).constructorParameters.toEqualTypeOf<
    [issues: readonly StandardSchemaV1.Issue[]]
  >()
  expectTypeOf<EnvexCredentialLeakError['findings']>().toEqualTypeOf<
    CredentialFinding[]
  >()
  expectTypeOf<EnvexValidationError['issues']>().toEqualTypeOf<
    readonly StandardSchemaV1.Issue[]
  >()
})
