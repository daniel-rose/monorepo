import { describe, expect, it } from 'vitest'

import matchRemote from '../../../src/match/matchRemote'

describe('matchRemote', () => {
  it('matches a path-prefix entry', () => {
    expect(matchRemote('github.com/acme/app', 'github.com/acme')).toBe(true)
  })

  it('matches case-insensitively', () => {
    expect(matchRemote('GitHub.com/ACME/app', 'github.com/acme')).toBe(true)
  })

  it('matches host-only entries', () => {
    expect(
      matchRemote('gitlab.example.com/team/app', 'gitlab.example.com')
    ).toBe(true)
  })

  it('does not match a partial segment', () => {
    expect(matchRemote('github.com/acme-old/app', 'github.com/acme')).toBe(
      false
    )
  })

  it('matches on exact equality', () => {
    expect(matchRemote('github.com/acme/app', 'github.com/acme/app')).toBe(true)
  })
})
