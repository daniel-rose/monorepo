import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { CredentialFinding } from './types.ts'

/** @deprecated Use EnvexWindowEnvIsMissingError instead */
export class EnvexScriptIsMissingError extends Error {}

export class EnvexWindowEnvIsMissingError extends EnvexScriptIsMissingError {}

export class EnvexProviderIsMissingError extends Error {}

export class EnvexCredentialLeakError extends Error {
  public readonly findings: CredentialFinding[]

  constructor(findings: CredentialFinding[]) {
    super(
      `envex blocked env output: potential credential(s) detected in ` +
        `${findings.map(finding => `${finding.key} (${finding.reason})`).join(', ')}. ` +
        `Rename the variable without the public prefix, add its name to the scan allowlist, ` +
        `or disable scanning.`
    )
    this.name = 'EnvexCredentialLeakError'
    this.findings = findings
  }
}

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
