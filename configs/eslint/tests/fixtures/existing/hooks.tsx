import { useState } from 'react'

const Toggle = ({ enabled }: { enabled: boolean }) => {
  if (!enabled) {
    return null
  }

  const [on] = useState(false)

  return <span>{String(on)}</span>
}

export default Toggle
