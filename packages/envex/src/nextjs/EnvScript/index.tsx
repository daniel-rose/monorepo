import Script from 'next/script'
import { getPublicEnv } from '../utils'
import type { EnvScriptProps } from './types'

const EnvScript = async ({ scan, schema }: EnvScriptProps = {}) => {
  const env = await getPublicEnv({ scan, schema })

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
