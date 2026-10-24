import { SCHEMA_URL } from '../../constants'
import readPackageVersion from '../readPackageVersion'

const DECIMAL = 10

// The schema URL of the installed major. Read at runtime like the version,
// so a major release needs no hand-edited constant.
const readSchemaUrl = (): string =>
  SCHEMA_URL(Number.parseInt(readPackageVersion(), DECIMAL))

export default readSchemaUrl
