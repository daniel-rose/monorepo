import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { HOOK_VERSION, SHELL } from '../../../src/constants'
import findPackageRoot from '../../../src/context/findPackageRoot'
import readHook from '../../../src/hook/readHook'

const ASCII_LIMIT = 0x80
const MACOS_BASH = '/bin/bash'
const ZSH_CANDIDATES = ['/bin/zsh', '/usr/bin/zsh']

const hookPath = (extension: string): string =>
  join(findPackageRoot(), 'hooks', `ccprofile.${extension}`)

describe('readHook', () => {
  it.each(Object.values(SHELL))(
    'starts the %s hook with the version line',
    async shell => {
      const text = await readHook(shell)

      expect(text.split('\n')[0]).toBe(`# ccprofile hook v${HOOK_VERSION}`)
    }
  )

  it('serves the same file to pwsh and powershell', async () => {
    expect(await readHook(SHELL.pwsh)).toBe(await readHook(SHELL.powershell))
  })

  it('keeps every hook on LF line endings', async () => {
    for (const shell of Object.values(SHELL)) {
      expect(await readHook(shell)).not.toContain('\r')
    }
  })

  // Windows PowerShell 5.1 reads BOM-less files as ANSI.
  it('keeps the PowerShell hook pure ASCII', () => {
    const bytes = readFileSync(hookPath('ps1'))

    expect(bytes.every(byte => byte < ASCII_LIMIT)).toBe(true)
  })

  // macOS still ships bash 3.2 as /bin/bash.
  it.skipIf(!existsSync(MACOS_BASH))(
    'parses the bash hook with /bin/bash',
    () => {
      expect(() =>
        execFileSync(MACOS_BASH, ['-n', hookPath('bash')], { stdio: 'pipe' })
      ).not.toThrow()
    }
  )

  const zsh = ZSH_CANDIDATES.find(path => existsSync(path))
  it.skipIf(zsh === undefined)('parses the zsh hook with zsh -n', () => {
    expect(() =>
      execFileSync(zsh ?? '', ['-n', hookPath('zsh')], { stdio: 'pipe' })
    ).not.toThrow()
  })
})
