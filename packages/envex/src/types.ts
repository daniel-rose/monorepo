export type Env = Record<string, string | undefined>

export type EnvFetchStrategy = (endpoint: string) => Promise<Env>

declare global {
  interface Window {
    ENV?: Env
  }
}
