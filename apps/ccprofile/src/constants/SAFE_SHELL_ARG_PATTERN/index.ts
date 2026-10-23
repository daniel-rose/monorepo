// Arguments allowed through cmd.exe when a .cmd/.bat shim needs `shell: true`.
const SAFE_SHELL_ARG_PATTERN = /^[A-Za-z0-9_.:/=-]+$/

export default SAFE_SHELL_ARG_PATTERN
