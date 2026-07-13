import { getPublicEnv } from '@daniel-rose/envex/server'
import { envSchema } from '../env'

export default async function SchemaPage() {
  const env = await getPublicEnv({ schema: envSchema })

  return (
    <div data-testid='schema-env'>
      <span>NEXT_PUBLIC_FOO: {env.NEXT_PUBLIC_FOO}</span>
    </div>
  )
}
