import type { z } from 'zod'

import { CONFIG_REASON } from '../../constants'
import formatPath from '../formatPath'

// `<json.path>: <reason>`; issues at the root use `rootName` (the file name).
const formatIssues = (error: z.ZodError, rootName: string): string[] =>
  error.issues.flatMap(issue => {
    if (issue.code === 'unrecognized_keys') {
      return issue.keys.map(
        key =>
          `${formatPath([...issue.path, key])}: ${CONFIG_REASON.unknownKey}`
      )
    }
    return `${formatPath(issue.path) || rootName}: ${issue.message}`
  })

export default formatIssues
