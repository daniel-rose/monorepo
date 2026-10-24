import { useState } from 'react'

const useToggle = (enabled: boolean) => {
  if (!enabled) {
    return false
  }

  const [on] = useState(false)

  return on
}

export default useToggle
