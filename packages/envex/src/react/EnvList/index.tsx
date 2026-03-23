'use client'

import { useEnv } from '../EnvexProvider/hooks'

const EnvList = () => {
  const env = useEnv()
  const names = Object.keys(env)

  if (names.length === 0) {
    return <p>window.ENV is empty.</p>
  }

  return (
    <ul data-testid='env-list'>
      {names.map(name => {
        return (
          <li key={name}>
            {name}: {env[name]}
          </li>
        )
      })}
    </ul>
  )
}

export default EnvList
