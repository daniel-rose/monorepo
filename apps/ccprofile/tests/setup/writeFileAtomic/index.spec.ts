import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import writeFileAtomic from '../../../src/setup/writeFileAtomic'

const posixOnly = it.skipIf(process.platform === 'win32')

describe('writeFileAtomic', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'ccprofile-atomic-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('creates a missing file and its parent directories', async () => {
    const file = join(dir, 'a', 'b', 'new.txt')

    await writeFileAtomic(file, 'hello\n')

    expect(readFileSync(file, 'utf8')).toBe('hello\n')
  })

  it('replaces an existing file and leaves no temp file behind', async () => {
    const file = join(dir, 'rc')
    writeFileSync(file, 'old')

    await writeFileAtomic(file, 'new')

    expect(readFileSync(file, 'utf8')).toBe('new')
    expect(readdirSync(dir)).toEqual(['rc'])
  })

  posixOnly('keeps a symlink and updates its target', async () => {
    const target = join(dir, 'dotfiles', 'zshrc')
    mkdirSync(join(dir, 'dotfiles'))
    writeFileSync(target, 'old')
    const link = join(dir, '.zshrc')
    symlinkSync(target, link)

    await writeFileAtomic(link, 'new')

    expect(lstatSync(link).isSymbolicLink()).toBe(true)
    expect(readFileSync(target, 'utf8')).toBe('new')
    expect(readdirSync(join(dir, 'dotfiles'))).toEqual(['zshrc'])
  })

  posixOnly('writes through a dangling symlink', async () => {
    const target = join(dir, 'later')
    const link = join(dir, '.zshrc')
    symlinkSync(target, link)

    await writeFileAtomic(link, 'new')

    expect(lstatSync(link).isSymbolicLink()).toBe(true)
    expect(readFileSync(target, 'utf8')).toBe('new')
  })

  it('preserves a UTF-8 byte order mark', async () => {
    const file = join(dir, 'profile.ps1')
    writeFileSync(file, '﻿old')

    await writeFileAtomic(file, 'new')

    expect(readFileSync(file)).toEqual(Buffer.from('﻿new', 'utf8'))
  })

  it('adds no byte order mark to a file that had none', async () => {
    const file = join(dir, 'rc')
    writeFileSync(file, 'old')

    await writeFileAtomic(file, 'new')

    expect(readFileSync(file)).toEqual(Buffer.from('new'))
  })

  posixOnly('preserves the mode of the old file', async () => {
    const file = join(dir, 'rc')
    writeFileSync(file, 'old')
    chmodSync(file, 0o640)

    await writeFileAtomic(file, 'new')

    expect(statSync(file).mode & 0o777).toBe(0o640)
  })
})
