import type { StandardSchemaV1 } from '@standard-schema/spec'

/** @deprecated Use EnvexWindowEnvIsMissingError instead */
export class EnvexScriptIsMissingError extends Error {}

export class EnvexWindowEnvIsMissingError extends EnvexScriptIsMissingError {}

export class EnvexProviderIsMissingError extends Error {}

export class EnvexValidationError extends Error {
  readonly issues: readonly StandardSchemaV1.Issue[]

  constructor(issues: readonly StandardSchemaV1.Issue[]) {
    super(
      `Environment validation failed: ${issues
        .map(
          i =>
            `[${(i.path ?? []).map(p => (typeof p === 'object' ? p.key : p)).join('.')}] ${i.message}`
        )
        .join('; ')}`
    )
    this.name = 'EnvexValidationError'
    this.issues = issues
  }
}
