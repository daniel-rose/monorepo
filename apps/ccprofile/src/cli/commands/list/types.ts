import type { AccountLimits } from '../../../limits'

// The limit files of the profiles with accounts, keyed by profile name.
export type ProfileLimits = ReadonlyMap<string, readonly AccountLimits[]>
