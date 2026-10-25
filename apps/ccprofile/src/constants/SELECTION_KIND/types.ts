import type SELECTION_KIND from '.'

export type SelectionKind = (typeof SELECTION_KIND)[keyof typeof SELECTION_KIND]
