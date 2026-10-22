import { describe, expect, it } from 'vitest'

import normalizeRemote from '../../../src/match/normalizeRemote'

describe('normalizeRemote', () => {
  it.each([
    ['git@gitlab.example.com:team/app.git', 'gitlab.example.com/team/app'],
    [
      'ssh://git@gitlab.example.com:2222/team/app.git',
      'gitlab.example.com/team/app',
    ],
    ['https://github.com/acme/app.git', 'github.com/acme/app'],
    ['https://user@GitHub.com/acme/app/', 'github.com/acme/app'],
    ['git@github-work:acme/x', 'github-work/acme/x'],
    ['gitlab.example.com', 'gitlab.example.com'],
    ['github.com/acme', 'github.com/acme'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeRemote(input)).toBe(expected)
  })

  it.each([
    ['../repo.git'],
    ['/srv/git/repo.git'],
    ['file:///srv/repo.git'],
    ['C:\\repos\\repo.git'],
    ['\\\\server\\share\\repo.git'],
    ['codecommit::eu-west-1://repo'],
    [''],
  ])('returns null for %j', input => {
    expect(normalizeRemote(input)).toBeNull()
  })
})
