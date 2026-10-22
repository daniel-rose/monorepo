import type EXIT_CODE from '.'

export type ExitCode = (typeof EXIT_CODE)[keyof typeof EXIT_CODE]
