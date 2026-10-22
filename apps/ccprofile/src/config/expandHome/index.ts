import { CONFIG_FILE } from '../../constants'

const TRAILING_SEPARATORS = /[/\\]+$/
const LEADING_HOME_SEPARATOR = /^[/\\]/

// Expands `~`, `~/…` and `~\…`; other values (including `~user/…`) stay as
// they are. The separator follows the homedir, so a Windows home yields
// backslashes without needing the platform.
const expandHome = (value: string, homedir: string): string => {
  const { homeMarker } = CONFIG_FILE
  if (value === homeMarker) return homedir

  const rest = value.slice(homeMarker.length)
  if (!value.startsWith(homeMarker) || !LEADING_HOME_SEPARATOR.test(rest)) {
    return value
  }

  const separator = homedir.includes('\\') ? '\\' : '/'
  const tail = rest.slice(1)
  return `${homedir.replace(TRAILING_SEPARATORS, '')}${separator}${
    separator === '\\' ? tail.replaceAll('/', '\\') : tail
  }`
}

export default expandHome
