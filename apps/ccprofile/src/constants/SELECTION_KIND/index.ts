// Why `resolve` took the account it took: the first one (no request, no
// full account before it), CCPROFILE_ACCOUNT, the limit data (an earlier
// account is full), or all accounts full (the one free first).
const SELECTION_KIND = {
  first: 'first',
  explicit: 'explicit',
  auto: 'auto',
  allFull: 'allFull',
} as const

export default SELECTION_KIND
