import type { CredentialFinding } from '../../types.ts'

class EnvexCredentialLeakError extends Error {
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

export default EnvexCredentialLeakError
