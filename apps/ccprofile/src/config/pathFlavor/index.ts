import path from 'node:path'

// The path rules of the target platform, never those of the host running the
// code (a win32 config can be read on a posix host in tests, and vice versa).
const pathFlavor = (platform: NodeJS.Platform): typeof path.posix =>
  platform === 'win32' ? path.win32 : path.posix

export default pathFlavor
