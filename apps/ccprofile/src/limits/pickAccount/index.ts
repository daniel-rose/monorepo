import { SELECTION_KIND } from '../../constants'
import type { Assessment, PickResult, SkippedAccount } from '../types'

type Candidate = { name: string; assessment: Assessment }

// Accounts in config order: the first one not known to be full wins. When
// all are full, the one free first (the latest reset of its full windows),
// ties in config order. `candidates` is never empty (the first account).
const pickAccount = (
  candidates: readonly Candidate[],
  threshold: number
): PickResult => {
  const skipped: SkippedAccount[] = []
  for (const [index, { name, assessment }] of candidates.entries()) {
    if (!assessment.isFull) {
      return index === 0
        ? { index, selection: { kind: SELECTION_KIND.first } }
        : {
            index,
            selection: { kind: SELECTION_KIND.auto, threshold, skipped },
          }
    }
    skipped.push({
      name,
      windows: assessment.windows,
      freeAt: assessment.freeAt,
    })
  }

  const index = skipped.reduce(
    (best, account, current) =>
      account.freeAt < skipped[best].freeAt ? current : best,
    0
  )
  return {
    index,
    selection: {
      kind: SELECTION_KIND.allFull,
      threshold,
      freeAt: skipped[index].freeAt,
    },
  }
}

export default pickAccount
