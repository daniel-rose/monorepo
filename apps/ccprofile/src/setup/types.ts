import type { MARKER_UPDATE_STATUS } from '../constants'

// `block`: a marker block in a startup file; `file`: the file itself is the
// integration (fish conf.d).
export type IntegrationTarget =
  { kind: 'block'; file: string } | { kind: 'file'; file: string }

export type MarkerUpdateStatus =
  (typeof MARKER_UPDATE_STATUS)[keyof typeof MARKER_UPDATE_STATUS]

export type MarkerUpdate =
  | {
      status:
        | typeof MARKER_UPDATE_STATUS.changed
        | typeof MARKER_UPDATE_STATUS.unchanged
      content: string
    }
  | { status: typeof MARKER_UPDATE_STATUS.malformed; reason: string }

// One file `setup` would write (`after` is the new text) or delete
// (`after === null`). `before === null` means the file does not exist yet.
export type FileChange = {
  file: string
  before: string | null
  after: string | null
  showDiff: boolean
}

export type SetupMode = 'install' | 'remove'

export type Plan =
  { ok: true; changes: FileChange[] } | { ok: false; message: string }
