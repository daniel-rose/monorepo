import { LINK_STEP, LINK_TEXT } from '../../../../constants'
import type { AccountPlan, LinkStep } from '../../../../link'

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

const formatPlan = (plan: AccountPlan): string[] => [
  LINK_TEXT.header(plan.profile, plan.account.name, plan.account.configDir),
  ...(plan.createAccountDir ? [LINK_TEXT.mkdir(plan.account.configDir)] : []),
  ...plan.createSourceDirs.map(LINK_TEXT.mkdir),
  ...plan.steps.flatMap(formatStep),
]

export default formatPlan
