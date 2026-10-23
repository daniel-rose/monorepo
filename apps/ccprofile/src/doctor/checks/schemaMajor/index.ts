import { CHECK_STATUS, DOCTOR_PATTERN, DOCTOR_TEXT } from '../../../constants'
import readPackageVersion from '../../../context/readPackageVersion'
import type { Check } from '../../types'

const DECIMAL = 10

// `$schema` pins a major (`…/ccprofile@1/schema.json`); a config written for
// another major may use keys this version does not know.
const checkSchemaMajor: Check = (_ctx, config) => {
  const major = DOCTOR_PATTERN.schemaMajor.exec(config?.schema ?? '')?.[1]
  if (major === undefined) return Promise.resolve([])

  const schemaMajor = Number.parseInt(major, DECIMAL)
  const version = readPackageVersion()
  const installedMajor = Number.parseInt(version, DECIMAL)

  return Promise.resolve([
    schemaMajor === installedMajor
      ? { status: CHECK_STATUS.ok, message: DOCTOR_TEXT.schemaOk(schemaMajor) }
      : {
          status: CHECK_STATUS.warn,
          message: DOCTOR_TEXT.schemaMismatch(schemaMajor, version),
        },
  ])
}

export default checkSchemaMajor
