import type { z } from 'zod'

import { CONFIG_REASON } from '../../constants'
import formatPath from '../formatPath'

type Issue = z.core.$ZodIssue

// An issue that shows the value had the option's shape: it lies below the
// value, or names unknown keys of it (those sit on the value itself).
const isInsideValue = (error: Issue): boolean =>
  error.path.length > 0 || error.code === 'unrecognized_keys'

// A union whose value had the shape of one option reports that option's
// issues, so `codex: {}` names `codex.home` and `codex: { "hom": … }` also
// `codex.hom` instead of the whole union.
const nestedIssues = (issue: Issue): Issue[] | undefined => {
  if (issue.code !== 'invalid_union') return undefined
  const option = issue.errors.find(
    errors => errors.length > 0 && errors.every(isInsideValue)
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
