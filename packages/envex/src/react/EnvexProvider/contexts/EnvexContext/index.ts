import { createContext } from 'react'
import type { Env } from '../../../../types.ts'

const EnvexContext = createContext<Env | undefined>(undefined)

export default EnvexContext
