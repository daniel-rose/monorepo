import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import checkBashProfile from '../../../../src/doctor/checks/bashProfile'
import createTestContext from '../../../helpers/createTestContext'

describe('checkBashProfile', () => {
  let home: string

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'ccprofile-doctor-bash-'))
  })

  afterEach(() => {
    rmSync(home, { recursive: true, force: true })
  })

  const ctxOn = (platform: NodeJS.Platform, shell = '/bin/bash') =>
    createTestContext({
      platform,
      homedir: home,
      env: { SHELL: shell, XDG_CONFIG_HOME: join(home, '.config') },
    })
  const write = (file: string, content: string) => {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, content)
  }

  it('warns on darwin when .bash_profile does not source .bashrc', async () => {
    write(join(home, '.bash_profile'), 'export A=1\n')

    const results = await checkBashProfile(ctxOn('darwin'), null)

    expect(results).toEqual([expect.objectContaining({ status: 'warn' })])
    expect(results[0]?.message).toContain('.bashrc')
    expect(results[0]?.message).not.toContain('ccprofile: warning:')
  })

  it('is ok when .bash_profile sources .bashrc', async () => {
    write(join(home, '.bash_profile'), '[ -f ~/.bashrc ] && source ~/.bashrc\n')

    expect(await checkBashProfile(ctxOn('darwin'), null)).toEqual([
      expect.objectContaining({ status: 'ok' }),
    ])
  })

  it('does not apply on linux', async () => {
    write(join(home, '.bash_profile'), 'export A=1\n')

    expect(await checkBashProfile(ctxOn('linux'), null)).toEqual([])
  })

  it('stays quiet for a zsh-only setup on darwin', async () => {
    expect(await checkBashProfile(ctxOn('darwin', '/bin/zsh'), null)).toEqual(
      []
    )
  })

  it('applies when a bash hook is installed even if $SHELL is another shell', async () => {
    write(join(home, '.config', 'ccprofile', 'hook.bash'), '# x\n')

    const results = await checkBashProfile(ctxOn('darwin', '/bin/zsh'), null)

    expect(results.map(result => result.status)).toEqual(['warn'])
  })
})
