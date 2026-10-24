import { stat } from 'node:fs/promises'

import type { ResolvedProfile } from '../../../config/types'
import {
  CHECK_STATUS,
  DOCTOR_TEXT,
  ENTRY_KIND,
  ENTRY_STATE,
  LINK_TEXT,
  TOOL,
} from '../../../constants'
import type { Context } from '../../../context/types'
import type { EntryInspection, LinkGroup, LinkTarget } from '../../../link'
import { inspectEntry, linkGroups } from '../../../link'
import type { Check, CheckResult } from '../../types'

const exists = (path: string): Promise<boolean> =>
  stat(path).then(
    () => true,
    () => false
  )

// An absent or correctly linked target: fine, unless the source is missing.
// A missing source file is reported in one line per account; a missing
// source directory is created by `link`.
const describeLinkable = (inspection: EntryInspection): string | null => {
  const { entry, target, sourceState, targetState } = inspection
  if (sourceState === ENTRY_STATE.source.missing) {
    return entry.kind === ENTRY_KIND.file
      ? null
      : DOCTOR_TEXT.entryMissing(target)
  }
  return targetState === ENTRY_STATE.target.linked
    ? null
    : DOCTOR_TEXT.entryMissing(target)
}

// The problem of one entry, or null when it is fine. The target decides
// before a missing source, so a conflict is never hidden behind it.
const describeEntry = (inspection: EntryInspection): string | null => {
  const { entry, source, target, sourceState } = inspection
  if (sourceState === ENTRY_STATE.source.wrongKind) {
    return DOCTOR_TEXT.entryWrongSource(
      target,
      LINK_TEXT.sourceWrongKind(source, entry.kind)
    )
  }

  switch (inspection.targetState) {
    case ENTRY_STATE.target.linked:
    case ENTRY_STATE.target.absent:
      return describeLinkable(inspection)
    case ENTRY_STATE.target.elsewhere:
      return DOCTOR_TEXT.entryElsewhere(
        target,
        LINK_TEXT.pointsElsewhere(inspection.linkedTo)
      )
    case ENTRY_STATE.target.replaced:
      return DOCTOR_TEXT.entryReplaced(
        target,
        inspection.isDirectory
          ? LINK_TEXT.replacedDirectory
          : LINK_TEXT.replacedFile,
        source
      )
  }
}

// codex details carry a `codex` prefix; a missing Codex home is already the
// codex login check's warning, so it is not repeated here.
const TOOL_LABEL = {
  [TOOL.claude]: {
    detail: (detail: string) => detail,
    reportsMissingDir: true,
  },
  [TOOL.codex]: {
    detail: DOCTOR_TEXT.codexDetail,
    reportsMissingDir: false,
  },
} as const

const checkTarget = async (
  group: LinkGroup,
  target: LinkTarget
): Promise<CheckResult[]> => {
  const label = TOOL_LABEL[group.tool]
  const say = (status: CheckResult['status'], detail: string) => ({
    status,
    message: DOCTOR_TEXT.accountEntry(
      group.profile,
      target.account,
      label.detail(detail)
    ),
  })
  if (!(await exists(target.dir))) {
    return label.reportsMissingDir
      ? [
          {
            status: CHECK_STATUS.warn,
            message: DOCTOR_TEXT.accountDirMissing(
              group.profile,
              target.account,
              target.dir
            ),
          },
        ]
      : []
  }

  const inspections = await Promise.all(
    group.entries.map(entry => inspectEntry(entry, group.source, target.dir))
  )
  const problems = inspections.flatMap(inspection => {
    const problem = describeEntry(inspection)
    return problem === null ? [] : [say(CHECK_STATUS.warn, problem)]
  })
  const noSources = inspections
    .filter(
      ({ entry, sourceState }) =>
        entry.kind === ENTRY_KIND.file &&
        sourceState === ENTRY_STATE.source.missing
    )
    .map(({ entry }) => entry.name)

  return [
    ...(problems.length === 0
      ? [say(CHECK_STATUS.ok, DOCTOR_TEXT.linksOk)]
      : problems),
    ...(noSources.length === 0
      ? []
      : [say(CHECK_STATUS.ok, DOCTOR_TEXT.noSources(noSources))]),
  ]
}

const sourceLine = (
  group: LinkGroup,
  profile: ResolvedProfile
): CheckResult => ({
  status: CHECK_STATUS.ok,
  message:
    group.tool === TOOL.codex
      ? DOCTOR_TEXT.codexSharedSource(profile.name, profile.codexHome)
      : DOCTOR_TEXT.sharedSource(profile.name, profile.configDir),
})

// Per profile and tool with further accounts: the shared source (first
// account), then per further account whether its entries are links to it
// (spec §3.4, §4). The codex entries include the `*.config.toml` files
// found now.
const checkAccountLinks: Check = async (ctx: Context, config) => {
  if (config === null) return []

  const perProfile = await Promise.all(
    config.profiles.map(async profile => {
      const groups = await linkGroups(profile, ctx)
      const perGroup = await Promise.all(
        groups.map(async group => [
          sourceLine(group, profile),
          ...(
            await Promise.all(
              group.targets.map(target => checkTarget(group, target))
            )
          ).flat(),
        ])
      )
      return perGroup.flat()
    })
  )
  return perProfile.flat()
}

export default checkAccountLinks
