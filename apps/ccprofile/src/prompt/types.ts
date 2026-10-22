export type LineReader = {
  readLine: (question: string) => Promise<string | null>
  close: () => void
}
