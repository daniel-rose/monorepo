import { describe, expect, it } from 'vitest'

import formatResolveLine from '../../../src/resolve/formatResolveLine'

describe('formatResolveLine', () => {
  it.each([
    { name: 'private', configDir: '/home/jane/.claude-private' },
    { name: 'work', configDir: undefined },
  ])('formats $name', ({ name, configDir }) => {
    expect(formatResolveLine({ name, configDir, paths: [], remotes: [] })).toBe(
      `${name}\t${configDir ?? ''}\n`
    )
  })
})
