import { readdir } from 'node:fs/promises'

import codexSource from '../../config/codexSource'
import sharedSource from '../../config/sharedSource'
import type { ResolvedProfile } from '../../config/types'
import {
  CODEX_SHARED_ENTRY,
  CONFIG_FILE,
  ENTRY_KIND,
  SHARED_ENTRY,
  TOOL,
} from '../../constants'
import type { Context } from '../../context/types'
import type { LinkGroup, SharedEntry } from '../types'

const isProfileFile = (name: string): boolean =>
  name.endsWith(CONFIG_FILE.codexProfileSuffix)

const namesIn = (dir: string): Promise<string[]> => readdir(dir).catch(() => [])

// Only links: a profile file of the account's own is none of link's
// business.
const linkNamesIn = (dir: string): Promise<string[]> =>
  readdir(dir, { withFileTypes: true }).then(
    entries =>
      entries.filter(entry => entry.isSymbolicLink()).map(({ name }) => name),
    () => []
  )

// Codex profile files (`<name>.config.toml`) of the source, plus the links
// to such files in the account dirs, so a link whose source is gone shows up
// too.
const codexProfileFiles = async (
  source: string,
  targets: readonly string[]
): Promise<SharedEntry[]> => {
  const names = new Set(
    [
      ...(await namesIn(source)),
      ...(await Promise.all(targets.map(linkNamesIn))).flat(),
    ].filter(isProfileFile)
  )
  return [...names].sort().map(name => ({ name, kind: ENTRY_KIND.file }))
}

// The Claude accounts of a profile link to its shared source.
const claudeGroup = (
  profile: ResolvedProfile,
  ctx: Pick<Context, 'homedir' | 'platform'>
): LinkGroup | null =>
  profile.accounts.length === 0
    ? null
    : {
        tool: TOOL.claude,
        profile: profile.name,
        source: sharedSource(profile, ctx),
        targets: profile.accounts.map(account => ({
          account: account.name,
          dir: account.configDir,
        })),
        entries: [...SHARED_ENTRY],
      }

// Only accounts with their own codex.home link to the profile's Codex home;
// the others use that home itself.
const codexGroup = async (
  profile: ResolvedProfile,
  ctx: Pick<Context, 'homedir' | 'platform'>
): Promise<LinkGroup | null> => {
  const targets = profile.accounts.flatMap(account =>
    account.codexHome === undefined
      ? []
      : [{ account: account.name, dir: account.codexHome }]
  )
  if (targets.length === 0) return null

  const source = codexSource(profile, ctx)
  return {
    tool: TOOL.codex,
    profile: profile.name,
    source,
    targets,
    entries: [
      ...CODEX_SHARED_ENTRY,
      ...(await codexProfileFiles(
        source,
        targets.map(({ dir }) => dir)
      )),
    ],
  }
}

// The link groups of a profile, Claude first.
const linkGroups = async (
  profile: ResolvedProfile,
  ctx: Pick<Context, 'homedir' | 'platform'>
): Promise<LinkGroup[]> =>
  [claudeGroup(profile, ctx), await codexGroup(profile, ctx)].filter(
    group => group !== null
  )

export default linkGroups
