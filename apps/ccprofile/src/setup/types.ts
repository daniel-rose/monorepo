import type {
  MARKER_UPDATE_STATUS,
  SETUP_MODE,
  TARGET_KIND,
} from '../constants'

export type TargetKind = (typeof TARGET_KIND)[keyof typeof TARGET_KIND]

export type IntegrationTarget = { kind: TargetKind; file: string }

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
// `bom`: write a UTF-8 byte order mark (Windows PowerShell 5.1 reads a file
// without one as ANSI). `owned`: a file ccprofile owns (the hook file), read
// leniently and always overwritten.
export type FileChange = {
  file: string
  before: string | null
  after: string | null
  showDiff: boolean
  bom: boolean
  owned: boolean
}

// `lenient`: for files ccprofile owns (the hook file). Never refused: an
// undecodable byte becomes U+FFFD, so the text just differs from the hook and
// the file gets overwritten (or removed).
export type ReadTextOptions = { lenient?: boolean }

export type SetupMode = (typeof SETUP_MODE)[keyof typeof SETUP_MODE]

// `notes`: lines to tell the user (a hook file kept on purpose).
export type Plan =
  | { ok: true; changes: FileChange[]; notes: string[] }
  | { ok: false; message: string }
