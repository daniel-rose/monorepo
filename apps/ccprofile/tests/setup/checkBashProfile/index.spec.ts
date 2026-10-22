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

  it('warns on darwin when there is no .bash_profile at all', async () => {
    expect(await checkBashProfile(ctxOn('darwin'))).toContain('.bash_profile')
  })

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
