export {
  createEnvRouteHandler,
  getEnv,
  getEnvByName,
  getPublicEnv,
  getPublicEnvByName,
} from './nextjs'

/**
 * The credential scanner lives here rather than on the root entry because
 * `scanForCredentials` reaches the secretlint engine, which imports the two
 * optional `@secretlint/*` peers. Re-exported from the browser entry, every
 * bundler had to resolve them for client code that can never run the scan, and
 * warned on each build when they were absent. Scanning is a server-side job, so
 * this is also where it belongs.
 */
export { assertNoCredentialLeak, scanForCredentials } from './utils'
