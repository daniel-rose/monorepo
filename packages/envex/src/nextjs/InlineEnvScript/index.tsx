import { getPublicEnv } from '../utils'
import type { InlineEnvScriptProps } from './types.ts'

const InlineEnvScript = async ({ scan }: InlineEnvScriptProps = {}) => {
  const env = await getPublicEnv(scan)

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
