// What every inquirer prompt gets: the streams of the context (prompts go to
// stderr, stdout belongs to the hook) and the abort of Ctrl-D.
export type PromptContext = {
  input: NodeJS.ReadableStream
  output: NodeJS.WritableStream
  signal: AbortSignal
}

export type Choice<Value> = {
  value: Value
  name: string
  description?: string
  checked?: boolean
}
