import { connection } from 'next/server'
import type { Env } from '../../../types.ts'

const getEnv = async (): Promise<Env> => {
  await connection()

  return process.env
}

export default getEnv
