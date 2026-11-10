import { CONFIG_PATTERN, CONFIG_REASON } from '../../../constants'
import text from '../text'

// A directory as written in the config: text without TAB or line breaks
// (the hook reads it from a tab-separated line).
const configDirText = (description: string) =>
  text(description).regex(
    CONFIG_PATTERN.noLineControl,
    CONFIG_REASON.lineControl
  )

export default configDirText
