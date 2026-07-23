import type { StandardSchemaV1 } from '@standard-schema/spec'

export interface GetEnvOptions<
  TSchema extends StandardSchemaV1 | undefined = undefined,
> {
  schema?: TSchema
  /**
   * Opt into Next.js dynamic rendering via `connection()` before reading
   * `process.env` (default `true`). Set to `false` to read the runtime env
   * WITHOUT calling `connection()` — required where dynamic request APIs are
   * forbidden, e.g. streamed `generateMetadata`, which can run during the
   * `after()` phase where `connection()` throws.
   */
  connection?: boolean
}
