import type SHELL from '.'

export type Shell = (typeof SHELL)[keyof typeof SHELL]
