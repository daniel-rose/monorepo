import { stat } from 'node:fs/promises'

import sharedSource from '../../config/sharedSource'
import type { ResolvedProfile } from '../../config/types'
import {
  ENTRY_KIND,
  ENTRY_STATE,
  LINK_STEP,
  LINK_TEXT,
  SHARED_ENTRY,
} from '../../constants'
import type { Context } from '../../context/types'
import inspectEntry from '../inspectEntry'
import type { AccountPlan, EntryInspection, LinkStep } from '../types'

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

// What `link` would do for every further account of the given profiles.
// Reads only; nothing is written here.
const planLinks = async (
  profiles: readonly ResolvedProfile[],
  ctx: Context
): Promise<AccountPlan[]> => {
  const plans: AccountPlan[] = []
  for (const profile of profiles) {
    const sourceDir = sharedSource(profile, ctx)
    for (const account of profile.accounts) {
      const steps: LinkStep[] = []
      for (const entry of SHARED_ENTRY) {
        steps.push(
          decide(await inspectEntry(entry, sourceDir, account.configDir))
        )
      }
      plans.push({
        profile: profile.name,
        account,
        createAccountDir: !(await exists(account.configDir)),
        createSourceDirs: steps
          .filter(needsSourceDir)
          .map(({ inspection }) => inspection.source),
        steps,
      })
    }
  }
  return plans
}

export default planLinks
