import { getPublicEnv } from '../utils'
import type { InlineEnvScriptProps } from './types'

const InlineEnvScript = async ({ scan, schema }: InlineEnvScriptProps = {}) => {
  const env = await getPublicEnv({ scan, schema })

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
