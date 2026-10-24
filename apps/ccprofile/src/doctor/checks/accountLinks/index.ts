import { stat } from 'node:fs/promises'

import sharedSource from '../../../config/sharedSource'
import type { Account, ResolvedProfile } from '../../../config/types'
import {
  CHECK_STATUS,
  DOCTOR_TEXT,
  ENTRY_KIND,
  ENTRY_STATE,
  LINK_TEXT,
  SHARED_ENTRY,
} from '../../../constants'
import type { Context } from '../../../context/types'
import type { EntryInspection } from '../../../link'
import { inspectEntry } from '../../../link'
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

const checkAccount = async (
  profile: ResolvedProfile,
  account: Account,
  sourceDir: string
): Promise<CheckResult[]> => {
  const say = (status: CheckResult['status'], detail: string) => ({
    status,
    message: DOCTOR_TEXT.accountEntry(profile.name, account.name, detail),
  })
  if (!(await exists(account.configDir))) {
    return [
      {
        status: CHECK_STATUS.warn,
        message: DOCTOR_TEXT.accountDirMissing(
          profile.name,
          account.name,
          account.configDir
        ),
      },
    ]
  }

  const inspections = await Promise.all(
    SHARED_ENTRY.map(entry => inspectEntry(entry, sourceDir, account.configDir))
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
      ? [
          {
            status: CHECK_STATUS.ok,
            message: DOCTOR_TEXT.accountLinksOk(profile.name, account.name),
          },
        ]
      : problems),
    ...(noSources.length === 0
      ? []
      : [say(CHECK_STATUS.ok, DOCTOR_TEXT.noSources(noSources))]),
  ]
}

// Profiles with accounts: the shared source (first account), then per
// further account whether its entries are links to it (spec §3.4).
const checkAccountLinks: Check = async (ctx: Context, config) => {
  if (config === null) return []

  const perProfile = await Promise.all(
    config.profiles
      .filter(profile => profile.accounts.length > 0)
      .map(async profile => {
        const sourceDir = sharedSource(profile, ctx)
        const accounts = await Promise.all(
          profile.accounts.map(account =>
            checkAccount(profile, account, sourceDir)
          )
        )
        return [
          {
            status: CHECK_STATUS.ok,
            message: DOCTOR_TEXT.sharedSource(profile.name, profile.configDir),
          },
          ...accounts.flat(),
        ]
      })
  )
  return perProfile.flat()
}

export default checkAccountLinks
