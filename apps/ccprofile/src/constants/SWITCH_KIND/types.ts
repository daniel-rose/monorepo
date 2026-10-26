import type SWITCH_KIND from '.'

export type SwitchKind = (typeof SWITCH_KIND)[keyof typeof SWITCH_KIND]
