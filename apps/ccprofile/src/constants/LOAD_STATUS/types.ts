import type LOAD_STATUS from '.'

export type LoadStatus = (typeof LOAD_STATUS)[keyof typeof LOAD_STATUS]
