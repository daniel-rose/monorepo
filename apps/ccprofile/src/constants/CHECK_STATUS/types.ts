import type CHECK_STATUS from '.'

export type CheckStatus = (typeof CHECK_STATUS)[keyof typeof CHECK_STATUS]
