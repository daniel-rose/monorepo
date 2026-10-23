// Environment variables of the shell test harness.
const TEST_ENV = {
  // Comma-separated shells to test, e.g. `zsh,bash`; unset runs none.
  shells: 'CCPROFILE_TEST_SHELLS',
  // Optional path of the bash to test (default: /bin/bash on macOS, Git Bash
  // on Windows, `bash` from PATH elsewhere).
  bash: 'CCPROFILE_TEST_BASH',
  // Set for the shell: the hook file it loads.
  hook: 'CCPROFILE_TEST_HOOK',
  // Set for the shell: the fake claude's report log and exit code.
  fakeLog: 'FAKE_CLAUDE_LOG',
  fakeExit: 'FAKE_CLAUDE_EXIT',
} as const

export default TEST_ENV
