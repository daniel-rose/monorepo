// How the fake claude is installed: an executable sh script (POSIX and Git
// Bash), or on Windows as `claude.cmd` or a real `claude.exe`.
const FAKE_VARIANT = {
  posix: 'posix',
  cmd: 'cmd',
  exe: 'exe',
} as const

export default FAKE_VARIANT
