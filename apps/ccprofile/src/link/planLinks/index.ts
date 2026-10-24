import { stat } from 'node:fs/promises'

import type { ResolvedProfile } from '../../config/types'
import type { Tool } from '../../constants'
import {
  ENTRY_KIND,
  ENTRY_STATE,
  LINK_STEP,
  LINK_TEXT,
  TOOL,
} from '../../constants'
import type { Context } from '../../context/types'
import inspectEntry from '../inspectEntry'
import linkGroups from '../linkGroups'
import type {
  EntryInspection,
  LinkGroup,
  LinkPlan,
  LinkStep,
  LinkTarget,
} from '../types'

const exists = (path: string): Promise<boolean> =>
  stat(path).then(
    () => true,
    () => false
  )

const conflict = (inspection: EntryInspection, reason: string): LinkStep => ({
  kind: LINK_STEP.conflict,
  inspection,
  reason,
})

// The step for one entry. A missing source directory is created; a missing
// source file is never invented, so no link dangles.
const decide = (inspection: EntryInspection): LinkStep => {
  const { entry, source, sourceState } = inspection
  if (sourceState === ENTRY_STATE.source.wrongKind) {
    return conflict(inspection, LINK_TEXT.sourceWrongKind(source, entry.kind))
  }
  if (
    sourceState === ENTRY_STATE.source.missing &&
    entry.kind === ENTRY_KIND.file
  ) {
    return { kind: LINK_STEP.noSource, inspection }
  }

  switch (inspection.targetState) {
    case ENTRY_STATE.target.linked:
      return { kind: LINK_STEP.ok, inspection }
    case ENTRY_STATE.target.absent:
      return { kind: LINK_STEP.create, inspection }
    case ENTRY_STATE.target.elsewhere:
      return conflict(
        inspection,
        LINK_TEXT.pointsElsewhere(inspection.linkedTo)
      )
    case ENTRY_STATE.target.replaced:
      return conflict(
        inspection,
        inspection.isDirectory
          ? LINK_TEXT.replacedDirectory
          : LINK_TEXT.replacedFile
      )
  }
}

const needsSourceDir = ({ kind, inspection }: LinkStep): boolean =>
  (kind === LINK_STEP.create || kind === LINK_STEP.ok) &&
  inspection.sourceState === ENTRY_STATE.source.missing

const planTarget = async (
  group: LinkGroup,
  target: LinkTarget
): Promise<LinkPlan> => {
  const steps: LinkStep[] = []
  for (const entry of group.entries) {
    steps.push(decide(await inspectEntry(entry, group.source, target.dir)))
  }
  return {
    tool: group.tool,
    profile: group.profile,
    account: target.account,
    dir: target.dir,
    createDir: !(await exists(target.dir)),
    createSourceDirs: steps
      .filter(needsSourceDir)
      .map(({ inspection }) => inspection.source),
    steps,
  }
}

const planGroup = async (group: LinkGroup): Promise<LinkPlan[]> => {
  const plans: LinkPlan[] = []
  for (const target of group.targets) {
    plans.push(await planTarget(group, target))
  }
  return plans
}

// Codex refuses to start without its CODEX_HOME, so `link` creates the
// profile's even without further accounts.
const planCodexHome = async (profile: ResolvedProfile): Promise<LinkPlan[]> =>
  profile.codexHome === undefined || (await exists(profile.codexHome))
    ? []
    : [
        {
          tool: TOOL.codex,
          profile: profile.name,
          account: profile.name,
          dir: profile.codexHome,
          createDir: true,
          createSourceDirs: [],
          steps: [],
        },
      ]

// What `link` would do for the given profiles: per profile the Claude
// accounts, the profile's Codex home, the Codex accounts. Reads only;
// nothing is written here.
const planLinks = async (
  profiles: readonly ResolvedProfile[],
  ctx: Context
): Promise<LinkPlan[]> => {
  const plans: LinkPlan[] = []
  for (const profile of profiles) {
    const groups = await linkGroups(profile, ctx)
    const ofTool = (tool: Tool) => groups.filter(group => group.tool === tool)
    for (const group of ofTool(TOOL.claude))
      plans.push(...(await planGroup(group)))
    plans.push(...(await planCodexHome(profile)))
    for (const group of ofTool(TOOL.codex))
      plans.push(...(await planGroup(group)))
  }
  return plans
}

export default planLinks
