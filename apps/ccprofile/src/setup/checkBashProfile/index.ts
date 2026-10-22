import { readFile } from 'node:fs/promises'

import pathFlavor from '../../config/pathFlavor'
import { SETUP_FILE, SETUP_TEXT } from '../../constants'
import type { Context } from '../../context/types'

const COMMENT_LINE = /^\s*#/
const SOURCES_BASHRC = /\.bashrc\b/
const LOGIN_SHELL_PLATFORMS: readonly NodeJS.Platform[] = ['darwin', 'win32']

const readOrNull = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, 'utf8')
  } catch {
    return null
  }
}

// Bash login shells read ~/.bash_profile, not ~/.bashrc. Warns (text) if the
// hook would not be loaded there: .bash_profile exists, or the platform opens
// login shells by default, and it does not source ~/.bashrc.
const checkBashProfile = async (ctx: Context): Promise<string | null> => {
  const profile = await readOrNull(
    pathFlavor(ctx.platform).join(ctx.homedir, SETUP_FILE.bashProfile)
  )

  if (profile === null) {
    return LOGIN_SHELL_PLATFORMS.includes(ctx.platform)
      ? SETUP_TEXT.bashProfileMissing
      : null
  }

  const sourcesBashrc = profile
    .split(/\r?\n/)
    .some(line => !COMMENT_LINE.test(line) && SOURCES_BASHRC.test(line))
  return sourcesBashrc ? null : SETUP_TEXT.bashProfileNoBashrc
}

export default checkBashProfile
