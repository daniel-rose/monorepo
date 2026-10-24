import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ENTRY_KIND } from '../../../src/constants'
import inspectEntry from '../../../src/link/inspectEntry'
import createSandbox from '../../helpers/createSandbox'

const SKILLS = { name: 'skills', kind: ENTRY_KIND.directory } as const
const SETTINGS = { name: 'settings.json', kind: ENTRY_KIND.file } as const

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let source = ''
let account = ''

beforeEach(async () => {
  sandbox = await createSandbox()
  source = sandbox.dir('source')
  account = sandbox.dir('account')
})

afterEach(() => sandbox.cleanup())

describe('inspectEntry', () => {
  it('accepts a relative link to the source', async () => {
    mkdirSync(join(source, 'skills'))
    symlinkSync(join('..', 'source', 'skills'), join(account, 'skills'))

    expect(await inspectEntry(SKILLS, source, account)).toMatchObject({
      sourceState: 'present',
      targetState: 'linked',
    })
  })

  it('accepts a link to a source dir that does not exist yet', async () => {
    symlinkSync(join(source, 'skills'), join(account, 'skills'))

    expect(await inspectEntry(SKILLS, source, account)).toMatchObject({
      sourceState: 'missing',
      targetState: 'linked',
    })
  })

  it('does not follow a link when it inspects the target', async () => {
    writeFileSync(join(source, 'settings.json'), '{}')
    const copy = join(sandbox.home, 'copy.json')
    writeFileSync(copy, '{}')
    symlinkSync(copy, join(account, 'settings.json'))

    expect(await inspectEntry(SETTINGS, source, account)).toMatchObject({
      targetState: 'elsewhere',
      linkedTo: copy,
    })
  })

  it('reports a source of the wrong kind', async () => {
    mkdirSync(join(source, 'settings.json'))

    expect(await inspectEntry(SETTINGS, source, account)).toMatchObject({
      sourceState: 'wrongKind',
      targetState: 'absent',
    })
  })

  it('reports a real directory in the account dir as replaced', async () => {
    mkdirSync(join(account, 'skills'))

    expect(await inspectEntry(SKILLS, source, account)).toMatchObject({
      targetState: 'replaced',
      isDirectory: true,
    })
  })
})
