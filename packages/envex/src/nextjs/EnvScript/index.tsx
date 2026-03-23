import Script from 'next/script'
import { getPublicEnv } from '../utils'

const EnvScript = async () => {
  const env = await getPublicEnv()

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
