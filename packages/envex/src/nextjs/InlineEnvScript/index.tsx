import { getPublicEnv } from '../utils'

const InlineEnvScript = async () => {
  const env = await getPublicEnv()

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
