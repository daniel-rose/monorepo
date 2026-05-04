export type { StandardSchemaV1 } from '@standard-schema/spec'

export type Env = Record<string, string | undefined>

declare global {
  interface Window {
    ENV?: Env
  }
}
