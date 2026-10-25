import type LIMITS_STATUS from '.'

export type LimitsStatus = (typeof LIMITS_STATUS)[keyof typeof LIMITS_STATUS]
