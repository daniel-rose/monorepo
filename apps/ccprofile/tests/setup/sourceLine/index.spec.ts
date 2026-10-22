import { describe, expect, it } from 'vitest'

import sourceLine from '../../../src/setup/sourceLine'

describe('sourceLine', () => {
  it.each(['zsh', 'bash'] as const)(
    'single-quotes the path for %s, spaces and non-ASCII included',
    shell => {
      expect(sourceLine(shell, '/tmp/x/Jürgen Müller/hook.zsh')).toBe(
        "source '/tmp/x/Jürgen Müller/hook.zsh'"
      )
    }
  )

  it.each(['zsh', 'bash'] as const)(
    "escapes a single quote as '\\'' for %s",
    shell => {
      expect(sourceLine(shell, "/tmp/it's/hook")).toBe(
        "source '/tmp/it'\\''s/hook'"
      )
    }
  )

  it.each(['pwsh', 'powershell'] as const)(
    'dot-sources the path for %s and doubles single quotes',
    shell => {
      expect(sourceLine(shell, "C:\\Users\\O'Neil\\hook.ps1")).toBe(
        ". 'C:\\Users\\O''Neil\\hook.ps1'"
      )
    }
  )

  it('rejects fish, which needs no source line', () => {
    expect(() => sourceLine('fish', '/x')).toThrow()
  })
})
