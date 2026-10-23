export type RunCommandOptions = {
  cwd?: string
  env?: Record<string, string | undefined>
  timeoutMs?: number
  input?: 'ignore' | 'inherit'
}

export type RunCommandResult = {
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
  notFound: boolean
}

export type RunCommand = (
  file: string,
  args: readonly string[],
  options?: RunCommandOptions
) => Promise<RunCommandResult>

export type Context = {
  cwd: string
  env: Readonly<Record<string, string | undefined>>
  platform: NodeJS.Platform
  homedir: string
  stdin: NodeJS.ReadableStream & { isTTY?: boolean }
  stdout: NodeJS.WritableStream
  stderr: NodeJS.WritableStream
  runCommand: RunCommand
}
