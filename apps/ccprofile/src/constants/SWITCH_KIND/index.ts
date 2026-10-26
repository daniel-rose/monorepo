// What `ccprofile switch` found for the running account: another account to
// continue on, no other account in the profile, or all others full.
const SWITCH_KIND = {
  target: 'target',
  noOther: 'noOther',
  allFull: 'allFull',
} as const

export default SWITCH_KIND
