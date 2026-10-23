import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import checkBashProfile from '../../../src/setup/checkBashProfile'
import createTestContext from '../../helpers/createTestContext'

describe('checkBashProfile', () => {
  let home: string

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'ccprofile-bashprofile-'))
    mkdirSync(home, { recursive: true })
  })

  afterEach(() => {
    rmSync(home, { recursive: true, force: true })
  })

  const ctxOn = (platform: NodeJS.Platform) =>
    createTestContext({ platform, homedir: home })

  it('warns on darwin when .bash_profile lacks a .bashrc source', async () => {
    writeFileSync(join(home, '.bash_profile'), 'export A=1\n')
    expect(await checkBashProfile(ctxOn('darwin'))).toContain('.bashrc')
  })

  it.each(['darwin', 'win32'] as const)(
    'warns on %s when there is no .bash_profile, without shadowing ~/.profile',
    async platform => {
      const warning = await checkBashProfile(ctxOn(platform))
      expect(warning).toContain('~/.bash_profile does not exist')
      // Login bash falls back to these; the advice targets them first …
      expect(warning).toContain('~/.bash_login or else ~/.profile')
      expect(warning).toContain(
        'add to that file: [ -n "$BASH_VERSION" ] && [ -f ~/.bashrc ] && . ~/.bashrc'
      )
      // … and a newly created .bash_profile must keep loading them.
      expect(warning).toContain(
        'bash stops reading ~/.bash_login and ~/.profile'
      )
      expect(warning).toContain('[ -f ~/.profile ] && . ~/.profile')
      expect(warning).not.toContain('create it with')
    }
  )

  it('warns on linux when an existing .bash_profile lacks the source', async () => {
    writeFileSync(join(home, '.bash_profile'), 'export A=1\n')
    expect(await checkBashProfile(ctxOn('linux'))).not.toBeNull()
  })

  it('does not warn on linux without a .bash_profile', async () => {
    expect(await checkBashProfile(ctxOn('linux'))).toBeNull()
  })

  it('does not warn when .bash_profile sources .bashrc', async () => {
    writeFileSync(
      join(home, '.bash_profile'),
      '[ -f ~/.bashrc ] && source ~/.bashrc\n'
    )
    expect(await checkBashProfile(ctxOn('darwin'))).toBeNull()
  })

  it('ignores a commented-out .bashrc source', async () => {
    writeFileSync(join(home, '.bash_profile'), '# source ~/.bashrc\n')
    expect(await checkBashProfile(ctxOn('linux'))).not.toBeNull()
  })
})
