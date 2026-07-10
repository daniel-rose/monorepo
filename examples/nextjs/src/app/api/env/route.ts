import { createEnvRouteHandler } from '@daniel-rose/envex/server'

// Opt-in credential scanning via the optional secretlint engine.
export const GET = createEnvRouteHandler({ scan: { engine: 'secretlint' } })
