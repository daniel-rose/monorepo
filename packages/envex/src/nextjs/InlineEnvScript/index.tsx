import { getPublicEnv } from '../utils'
import type { InlineEnvScriptProps } from './types'

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
