import { realpath, stat } from 'node:fs/promises'

import { CONFIG_FILE, CONFIG_REASON } from '../../constants'
import type { Context } from '../../context/types'
import { normalizeRemote } from '../../match'
import expandHome from '../expandHome'
import formatPath from '../formatPath'
import pathFlavor from '../pathFlavor'
import type {
  ParsedConfig,
  ResolveConfigResult,
  ResolvedProfile,
} from '../types'

const CASE_INSENSITIVE_PLATFORMS: readonly NodeJS.Platform[] = [
  'win32',
  'darwin',
]

type DirIdentity = { keys: string[]; isFile: boolean }

// Keys that identify a directory: its resolved path plus, when it exists,
// the real path behind symlinks.
const identify = async (
  resolved: string,
  fold: (value: string) => string
): Promise<DirIdentity> => {
  try {
    if (!(await stat(resolved)).isDirectory()) {
      return { keys: [fold(resolved)], isFile: true }
    }
    return {
      keys: [fold(resolved), fold(await realpath(resolved))],
      isFile: false,
    }
  } catch {
    return { keys: [fold(resolved)], isFile: false }
  }
}

// Everything that needs the home directory, the platform or the filesystem:
// `~` expansion, absolute paths, remote normalization and configDir checks.
const resolveConfig = async (
  parsed: ParsedConfig,
  ctx: Context
): Promise<ResolveConfigResult> => {
  const flavor = pathFlavor(ctx.platform)
  const fold = (value: string) =>
    CASE_INSENSITIVE_PLATFORMS.includes(ctx.platform)
      ? value.toLowerCase()
      : value
  const issues: string[] = []
  const report = (path: readonly PropertyKey[], reason: string) => {
    issues.push(`${formatPath(path)}: ${reason}`)
  }

  const absolute = (value: string): string | undefined => {
    const expanded = expandHome(value, ctx.homedir)
    return flavor.isAbsolute(expanded) ? flavor.resolve(expanded) : undefined
  }

  const claudeHome = await identify(
    flavor.resolve(ctx.homedir, CONFIG_FILE.claudeDirName),
    fold
  )
  const seenDirs: { index: number; keys: string[] }[] = []
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

    let configDir: string | undefined
    if (profile.configDir !== undefined) {
      configDir = absolute(profile.configDir)

      if (configDir === undefined) {
        report(at('configDir'), CONFIG_REASON.notAbsolute)
      } else {
        const identity = await identify(configDir, fold)

        if (claudeHome.keys.some(key => identity.keys.includes(key))) {
          report(at('configDir'), CONFIG_REASON.claudeHome)
        }
        if (identity.isFile) {
          report(at('configDir'), CONFIG_REASON.notDirectory)
        }

        const twin = seenDirs.find(seen =>
          seen.keys.some(key => identity.keys.includes(key))
        )
        if (twin) {
          report(at('configDir'), `same directory as profiles[${twin.index}]`)
        }
        seenDirs.push({ index, keys: identity.keys })
      }
    }

    profiles.push({ name: profile.name, configDir, paths, remotes })
  }

  return {
    issues,
    config: {
      onUnknown: parsed.onUnknown,
      passthrough: parsed.passthrough,
      profiles,
      schema: parsed.$schema,
    },
  }
}

export default resolveConfig
