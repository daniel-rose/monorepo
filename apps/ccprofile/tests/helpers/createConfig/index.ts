import type { ResolvedConfig, ResolvedProfile } from '../../../src/config'

type ProfileInput = Partial<ResolvedProfile> & { name: string }

// A resolved config as `loadConfig` would return it, without touching disk.
const createConfig = (
  profiles: ProfileInput[],
  schema?: string
): ResolvedConfig => ({
  onUnknown: 'prompt',
  passthrough: [],
  accountThreshold: 90,
  schema,
  profiles: profiles.map(profile => ({
    configDir: undefined,
    paths: [],
    remotes: [],
    accounts: [],
    ...profile,
  })),
})

export default createConfig
