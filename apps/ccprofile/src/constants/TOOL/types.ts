import type TOOL from '.'

export type Tool = (typeof TOOL)[keyof typeof TOOL]
