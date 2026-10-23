// Limit for asking a PowerShell for its profile path. Windows PowerShell 5.1
// starts slowly, so this is generous; a hung PowerShell must not hang
// `setup` or `doctor`.
const PROFILE_QUERY_TIMEOUT_MS = 20_000

export default PROFILE_QUERY_TIMEOUT_MS
