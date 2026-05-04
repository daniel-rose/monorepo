import { createEnvRouteHandler } from '@daniel-rose/envex/server'
import { envSchema } from '../../env'

export const GET = createEnvRouteHandler({ schema: envSchema })
