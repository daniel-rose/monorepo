import type { StandardSchemaV1 } from '@standard-schema/spec'
import Script from 'next/script'
import { getPublicEnv } from '../utils'

interface EnvScriptProps {
  schema?: StandardSchemaV1
}

const EnvScript = async ({ schema }: EnvScriptProps = {}) => {
  const env = await getPublicEnv({ schema })

  const innerHTML = {
    __html: `window.ENV = ${JSON.stringify(env)}`,
  }

  return (
    <Script
      id='envex'
      strategy='beforeInteractive'
      dangerouslySetInnerHTML={innerHTML}
    />
  )
}

export default EnvScript
