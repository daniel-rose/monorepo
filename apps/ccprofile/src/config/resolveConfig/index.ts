import { CODEX_MODE, CONFIG_FILE, CONFIG_REASON } from '../../constants'
import type { Context } from '../../context/types'
import { normalizeRemote } from '../../match'
import expandHome from '../expandHome'
import formatPath from '../formatPath'
import identifyDir from '../identifyDir'
import pathFlavor from '../pathFlavor'
import type {
  Account,
  DirIdentity,
  ParsedConfig,
  ProfileCodex,
  ResolveConfigResult,
  ResolvedProfile,
} from '../types'

// Everything that needs the home directory, the platform or the filesystem:
// `~` expansion, absolute paths, remote normalization and configDir checks.
// configDirs of profiles and accounts share one uniqueness check.
const resolveConfig = async (
  parsed: ParsedConfig,
  ctx: Context
): Promise<ResolveConfigResult> => {
  const flavor = pathFlavor(ctx.platform)
  const identify = (dir: string) => identifyDir(dir, ctx.platform)
  const issues: string[] = []
  const report = (path: readonly PropertyKey[], reason: string) => {
    issues.push(`${formatPath(path)}: ${reason}`)
  }

  const absolute = (value: string): string | undefined => {
    const expanded = expandHome(value, ctx.homedir)
    return flavor.isAbsolute(expanded) ? flavor.resolve(expanded) : undefined
  }

  const claudeHome = await identify(
    flavor.resolve(ctx.homedir, CONFIG_FILE.claudeDirName)
  )
  const codexHome = await identify(
    flavor.resolve(ctx.homedir, CONFIG_FILE.codexDirName)
  )
  const seenDirs: { owner: string; keys: string[] }[] = []
  const isSame = (a: DirIdentity, b: DirIdentity) =>
    a.keys.some(key => b.keys.includes(key))

  // One uniqueness check for every configDir and codex.home. `owner` names
  // the entry in messages (`profiles[0]` for its configDir,
  // `profiles[0].codex` for its codex.home), `field` is the checked key.
  // `defaults` are the implicit default dirs this one must not be.
  const checkDir = async (
    value: string,
    owner: readonly PropertyKey[],
    field: string,
    defaults: readonly [DirIdentity, string][]
  ): Promise<string | undefined> => {
    const at = [...owner, field]
    const dir = absolute(value)
    if (dir === undefined) {
      report(at, CONFIG_REASON.notAbsolute)
      return undefined
    }

    const identity = await identify(dir)
    for (const [home, reason] of defaults) {
      if (isSame(home, identity)) report(at, reason)
    }
    if (identity.isFile) {
      report(at, CONFIG_REASON.notDirectory)
    }

    const twin = seenDirs.find(seen =>
      seen.keys.some(key => identity.keys.includes(key))
    )
    if (twin) {
      report(at, `same directory as ${twin.owner}`)
    }
    seenDirs.push({ owner: formatPath(owner), keys: identity.keys })
    return dir
  }

  const checkConfigDir = (value: string, owner: readonly PropertyKey[]) =>
    checkDir(value, owner, 'configDir', [
      [claudeHome, CONFIG_REASON.claudeHome],
      [codexHome, CONFIG_REASON.claudeInCodexHome],
    ])

  const checkCodexHome = async (
    codex: { home: string } | undefined,
    owner: readonly PropertyKey[]
  ): Promise<string | undefined> =>
    codex === undefined
      ? undefined
      : checkDir(codex.home, [...owner, 'codex'], 'home', [
          [codexHome, CONFIG_REASON.codexHome],
          [claudeHome, CONFIG_REASON.codexInClaudeHome],
        ])

  // `false` names no directory: nothing to check, nothing reserved.
  const checkProfileCodex = async (
    codex: { home: string } | false | undefined,
    owner: readonly PropertyKey[]
  ): Promise<ProfileCodex> => {
    if (codex === false) return { mode: CODEX_MODE.disabled }
    const home = await checkCodexHome(codex, owner)
    return home === undefined
      ? { mode: CODEX_MODE.default }
      : { mode: CODEX_MODE.home, home }
  }

  const profiles: ResolvedProfile[] = []

  for (const [index, profile] of parsed.profiles.entries()) {
    const at = (...path: PropertyKey[]) => ['profiles', index, ...path]

    const paths = profile.paths.flatMap((value, entry) => {
      const resolved = absolute(value)
      if (resolved === undefined) {
        report(at('paths', entry), CONFIG_REASON.notAbsolute)
        return []
      }
      return [resolved]
    })

    const remotes = profile.remotes.flatMap((value, entry) => {
      const normalized = normalizeRemote(value)
      if (normalized === null) {
        report(at('remotes', entry), CONFIG_REASON.noHost)
        return []
      }
      return [normalized]
    })

    const configDir =
      profile.configDir === undefined
        ? undefined
        : await checkConfigDir(profile.configDir, at())
    const codex = await checkProfileCodex(profile.codex, at())

    const accounts: Account[] = []
    for (const [entry, account] of profile.accounts.entries()) {
      const dir = await checkConfigDir(account.configDir, at('accounts', entry))
      const accountCodexHome = await checkCodexHome(
        account.codex,
        at('accounts', entry)
      )
      if (dir !== undefined) {
        accounts.push({
          name: account.name,
          configDir: dir,
          codexHome: accountCodexHome,
        })
      }
    }

    profiles.push({
      name: profile.name,
      configDir,
      codex,
      paths,
      remotes,
      accounts,
    })
  }

  return {
    issues,
    config: {
      onUnknown: parsed.onUnknown,
      passthrough: parsed.passthrough,
      accountThreshold: parsed.accountThreshold,
      profiles,
      schema: parsed.$schema,
    },
  }
}

export default resolveConfig
