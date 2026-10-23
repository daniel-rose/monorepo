// A PowerShell did not answer the profile query in time; `doctor` reports it
// where a missing PowerShell is skipped silently.
class ProfileQueryTimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProfileQueryTimeoutError'
  }
}

export default ProfileQueryTimeoutError
