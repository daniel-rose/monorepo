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
  accountLogin: (profile: string, account: string, state: string) =>
    `profile ${profile}, account ${account}: ${state}`,

  noLimitData: (profile: string) =>
    `profile ${profile}: no limit data from any account (ccprofile mod not installed?)`,
  limitData: (profile: string, withData: number, total: number) =>
    `profile ${profile}: limit data from ${withData} of ${total} accounts`,
  limitsInvalid: (owner: string) => `${owner}: limits.json invalid`,
  limitsUnsupported: (owner: string, version: number) =>
    `${owner}: limits.json version ${version} unsupported – update ccprofile and the ccprofile mod`,

  sharedSource: (profile: string, dir: string | undefined) =>
    `profile ${profile}: shared source ${dir ?? '~/.claude (default)'}`,
  codexSharedSource: (profile: string, dir: string | undefined) =>
    `profile ${profile}: codex shared source ${dir ?? '~/.codex (default)'}`,
  // Prefix of the codex link details of an account.
  codexDetail: (detail: string) => `codex ${detail}`,

  codexMissing: 'codex not found on PATH',
  codexDefaultLogin: (state: string) => `codex ~/.codex (default): ${state}`,
  codexLogin: (owner: string, state: string) => `${owner}: codex ${state}`,
  codexHomeMissing: (owner: string, dir: string) =>
    `${owner}: codex home ${dir} does not exist – run ccprofile link`,
  codexFromProfile: (owner: string) => `${owner}: codex from profile`,
  profileOwner: (profile: string) => `profile ${profile}`,
  accountOwner: (profile: string, account: string) =>
    `profile ${profile}, account ${account}`,
  codexSharedDefault: (profiles: readonly string[]) =>
    `profiles ${profiles.join(', ')} share ~/.codex – give each its own codex.home`,
  linksOk: 'links ok',
  accountDirMissing: (profile: string, account: string, dir: string) =>
    `profile ${profile}, account ${account}: ${dir} does not exist – run ccprofile link`,
  accountEntry: (profile: string, account: string, detail: string) =>
    `profile ${profile}, account ${account}: ${detail}`,
  entryMissing: (target: string) => `${target} missing – run ccprofile link`,
  entryReplaced: (target: string, kind: string, source: string) =>
    `${target} ${kind} – merge it into ${source}, delete it, run ccprofile link`,
  entryElsewhere: (target: string, detail: string) => `${target} ${detail}`,
  entryWrongSource: (target: string, detail: string) => `${target}: ${detail}`,
  noSources: (names: readonly string[]) => `no source for ${names.join(', ')}`,

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
