import { defineConfig } from 'vitest/config'

// Shell hook tests: CCPROFILE_TEST_SHELLS=zsh,bash,… selects the shells. The
// global setup needs a built dist/ and installs the packed package with npm.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/shell/**/*.spec.ts'],
    globalSetup: ['tests/shell/globalSetup/index.ts'],
    // Windows PowerShell 5.1 alone takes seconds to start.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
})
