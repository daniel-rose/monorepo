// Texts of `doctor` (spec §11). Messages carry no status and no newline.
const DOCTOR_TEXT = {
  configOk: (path: string) => `config ${path}`,
  configMissing: (path: string) => `no config (${path}) – run ccprofile init`,
  configInvalid: (path: string, issue: string) => `config ${path}: ${issue}`,

  claudeOk: (version: string | undefined) =>
    version === undefined
      ? 'claude found on PATH'
      : `claude found on PATH (${version})`,
  claudeMissing: 'claude not found on PATH',
  claudeFailed: (reason: string | undefined) =>
    reason === undefined
      ? 'claude --version failed'
      : `claude --version failed (${reason})`,
  claudeTimedOut: 'claude --version did not answer in time',

  login: (profile: string, state: string) => `profile ${profile}: ${state}`,

  noHook: 'no shell hook installed – run ccprofile setup',
  hookFileOk: (label: string, file: string, version: number) =>
    `${label} hook ${file} is current (v${version})`,
  hookFileMissing: (label: string, file: string) =>
    `${label} hook ${file} is missing – run ccprofile setup`,
  hookFileUnreadable: (label: string, file: string) =>
    `${label} hook ${file} cannot be read (not UTF-8 or no access)`,
  hookFileOutdated: (
    label: string,
    file: string,
    found: number | undefined,
    current: number
  ) =>
    `${label} hook ${file} is outdated (${
      found === undefined ? 'no version marker' : `found v${found}`
    }, current v${current}) – run ccprofile setup`,
  blockOk: (file: string) => `${file} loads the hook`,
  startupFileMissing: (file: string) =>
    `${file} does not exist – run ccprofile setup`,
  blockMissing: (file: string) =>
    `${file} has no ccprofile block – run ccprofile setup`,
  blockDiffers: (file: string) =>
    `the ccprofile block in ${file} differs from the expected one – run ccprofile setup`,
  blockMalformed: (file: string, reason: string) =>
    `${file}: ${reason} – fix it by hand`,
  startupFileUnreadable: (file: string) =>
    `${file} cannot be read (not UTF-8 or no access)`,

  bashProfileOk: '~/.bash_profile sources ~/.bashrc',

  pathsOk: 'all configured paths exist',
  pathMissing: (profile: string, path: string) =>
    `profile ${profile}: path ${path} does not exist`,

  shadowedOk: 'no shadowed selectors',
  shadowed: (
    kind: string,
    profile: string,
    entry: string,
    earlierProfile: string,
    earlierEntry: string
  ) =>
    `profile ${profile}: ${kind} ${entry} is shadowed by ${kind} ${earlierEntry} of profile ${earlierProfile}, which is listed first and always matches first`,

  schemaOk: (major: number) => `$schema major matches (@${major})`,
  schemaMismatch: (schemaMajor: number, version: string) =>
    `$schema is @${schemaMajor} but ccprofile ${version} is installed – update the $schema URL in the config`,

  envOverride: (names: readonly string[]) =>
    `${names.join(' and ')} set in this shell – this shell bypasses profile detection`,
} as const

export default DOCTOR_TEXT
