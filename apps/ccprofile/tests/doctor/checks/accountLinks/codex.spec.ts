import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CODEX_SHARED_ENTRY } from '../../../../src/constants'
import checkAccountLinks from '../../../../src/doctor/checks/accountLinks'
import createConfig from '../../../helpers/createConfig'
import createSandbox from '../../../helpers/createSandbox'

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let source = ''
let seat = ''

const configOf = (codexHome: string | undefined) =>
  createConfig([
    {
      name: 'private',
      configDir: '/p/claude-private',
      codexHome,
      accounts: [
        { name: 'seat-2', configDir: '/p/claude-private-2', codexHome: seat },
      ],
    },
  ])

// Only the codex lines; the claude lines of the same accounts come first.
const codexLines = async (codexHome: string | undefined) =>
  (
    await checkAccountLinks(sandbox.ctx(sandbox.home), configOf(codexHome))
  ).filter(({ message }) => message.includes('codex'))

// Links every codex entry whose source exists, as `link` would.
const linkAll = (from: string): void => {
  mkdirSync(seat, { recursive: true })
  for (const { name } of CODEX_SHARED_ENTRY) {
    symlinkSync(join(from, name), join(seat, name))
  }
}

const fillSource = (dir: string): void => {
  for (const { name, kind } of CODEX_SHARED_ENTRY) {
    if (kind === 'directory') mkdirSync(join(dir, name))
    else writeFileSync(join(dir, name), '')
  }
}

beforeEach(async () => {
  sandbox = await createSandbox()
  source = sandbox.dir('.codex-private')
  seat = join(sandbox.home, '.codex-private-2')
  fillSource(source)
})

afterEach(() => sandbox.cleanup())

describe('checkAccountLinks for codex', () => {
  it('names the codex source and reports intact links once', async () => {
    linkAll(source)

    expect(await codexLines(source)).toEqual([
      {
        status: 'ok',
        message: `profile private: codex shared source ${source}`,
      },
      {
        status: 'ok',
        message: 'profile private, account seat-2: codex links ok',
      },
    ])
  })

  it('names ~/.codex as the codex source of a profile without codex', async () => {
    const home = sandbox.dir('.codex')
    fillSource(home)
    linkAll(home)

    expect(await codexLines(undefined)).toContainEqual({
      status: 'ok',
      message: 'profile private: codex shared source ~/.codex (default)',
    })
  })

  it('reports a codex profile file of the source that is not linked', async () => {
    linkAll(source)
    writeFileSync(join(source, 'deep.config.toml'), '')

    expect(await codexLines(source)).toContainEqual({
      status: 'warn',
      message: `profile private, account seat-2: codex ${join(seat, 'deep.config.toml')} missing – run ccprofile link`,
    })
  })

  it('leaves a missing codex home to the login check', async () => {
    expect(await codexLines(source)).toEqual([
      {
        status: 'ok',
        message: `profile private: codex shared source ${source}`,
      },
    ])
  })
})
