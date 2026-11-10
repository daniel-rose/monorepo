import type { z } from 'zod'

import { CONFIG_REASON } from '../../constants'
import formatPath from '../formatPath'

type Issue = z.core.$ZodIssue

// A union whose value had the shape of one option (every issue of that
// option lies below the value) reports that option's issues, so
// `codex: {}` names `codex.home` instead of the whole union.
const nestedIssues = (issue: Issue): Issue[] | undefined => {
  if (issue.code !== 'invalid_union') return undefined
  const option = issue.errors.find(
    errors => errors.length > 0 && errors.every(error => error.path.length > 0)
  )
  return option?.map(error => ({
    ...error,
    path: [...issue.path, ...error.path],
  }))
}

const formatIssue = (issue: Issue, rootName: string): string[] => {
  if (issue.code === 'unrecognized_keys') {
    return issue.keys.map(
      key => `${formatPath([...issue.path, key])}: ${CONFIG_REASON.unknownKey}`
    )
  }
  const nested = nestedIssues(issue)
  if (nested !== undefined) {
    return nested.flatMap(inner => formatIssue(inner, rootName))
  }
  return [`${formatPath(issue.path) || rootName}: ${issue.message}`]
}

// `<json.path>: <reason>`; issues at the root use `rootName` (the file name).
const formatIssues = (error: z.ZodError, rootName: string): string[] =>
  error.issues.flatMap(issue => formatIssue(issue, rootName))

export default formatIssues
