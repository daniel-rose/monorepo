// Names of the inquirer errors that end a prompt without an answer: Ctrl-C
// (ExitPromptError) and our abort on Ctrl-D (AbortPromptError).
const PROMPT_CANCEL_ERROR = {
  exit: 'ExitPromptError',
  abort: 'AbortPromptError',
} as const

export default PROMPT_CANCEL_ERROR
