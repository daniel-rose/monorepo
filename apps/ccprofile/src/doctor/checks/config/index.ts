import type { LoadConfigResult } from '../../../config'
import { CHECK_STATUS, DOCTOR_TEXT, LOAD_STATUS } from '../../../constants'
import type { Context } from '../../../context/types'
import type { CheckResult } from '../../types'

// Takes the already loaded config (runDoctor loads it once for all checks).
const checkConfig = (
  _ctx: Context,
  loaded: LoadConfigResult
): Promise<CheckResult[]> => {
  switch (loaded.status) {
    case LOAD_STATUS.missing:
      return Promise.resolve([
        {
          status: CHECK_STATUS.warn,
          message: DOCTOR_TEXT.configMissing(loaded.path),
        },
      ])
    case LOAD_STATUS.invalid:
      return Promise.resolve(
        loaded.issues.map(issue => ({
          status: CHECK_STATUS.fail,
          message: DOCTOR_TEXT.configInvalid(loaded.path, issue),
        }))
      )
    case LOAD_STATUS.ok:
      return Promise.resolve([
        {
          status: CHECK_STATUS.ok,
          message: DOCTOR_TEXT.configOk(loaded.path),
        },
      ])
  }
}

export default checkConfig
