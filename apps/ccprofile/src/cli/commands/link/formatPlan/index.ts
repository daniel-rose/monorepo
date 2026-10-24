import { LINK_STEP, LINK_TEXT, TOOL } from '../../../../constants'
import type { LinkPlan, LinkStep } from '../../../../link'

// Already correct links print nothing.
const formatStep = (step: LinkStep): string[] => {
  const { source, target } = step.inspection
  switch (step.kind) {
    case LINK_STEP.create:
      return [LINK_TEXT.create(target, source)]
    case LINK_STEP.noSource:
      return [LINK_TEXT.noSource(target)]
    case LINK_STEP.conflict:
      return [LINK_TEXT.conflict(target, step.reason)]
    case LINK_STEP.ok:
      return []
  }
}

const HEADER = {
  [TOOL.claude]: LINK_TEXT.header,
  [TOOL.codex]: LINK_TEXT.codexHeader,
} as const

const formatPlan = (plan: LinkPlan): string[] => [
  HEADER[plan.tool](plan.profile, plan.account, plan.dir),
  ...(plan.createDir ? [LINK_TEXT.mkdir(plan.dir)] : []),
  ...plan.createSourceDirs.map(LINK_TEXT.mkdir),
  ...plan.steps.flatMap(formatStep),
]

export default formatPlan
