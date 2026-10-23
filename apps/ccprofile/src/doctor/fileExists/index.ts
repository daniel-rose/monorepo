import { stat } from 'node:fs/promises'

const fileExists = async (file: string): Promise<boolean> => {
  try {
    await stat(file)
    return true
  } catch {
    return false
  }
}

export default fileExists
