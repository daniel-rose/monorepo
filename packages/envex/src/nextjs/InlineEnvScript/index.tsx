import type { StandardSchemaV1 } from '@standard-schema/spec'
import { getPublicEnv } from '../utils'

interface InlineEnvScriptProps {
  schema?: StandardSchemaV1
}

const InlineEnvScript = async ({ schema }: InlineEnvScriptProps = {}) => {
  const env = await getPublicEnv({ schema })

  return (
    <script
      id='envex-inline'
      dangerouslySetInnerHTML={{
        __html: `window.ENV = ${JSON.stringify(env).replace(/</g, '\\u003c')}`,
      }}
    />
  )
}

export default InlineEnvScript
