import type { Shell } from '../../../../src/constants'
import SCENARIO from '../../constants/SCENARIO'
import TEST_ENV from '../../constants/TEST_ENV'
import type { Scenario } from '../../types'

const HOOK = TEST_ENV.hook
const AFTER_FORMAT =
  'AFTER CCPROFILE=%s CCPROFILE_ACCOUNT=%s CLAUDE_CONFIG_DIR=%s CCPROFILE_ARGV=%s\\n'

// zsh and bash; the claude arguments are the positional parameters.
const POSIX_SCRIPT: Readonly<Record<Scenario, readonly string[]>> = {
  [SCENARIO.call]: [`. "$${HOOK}"`, 'claude "$@"'],
  [SCENARIO.codex]: [
    `. "$${HOOK}"`,
    'codex "$@"',
    'code=$?',
    `printf 'AFTER CODEX_HOME=%s\\n' "\${CODEX_HOME-<unset>}"`,
    'exit $code',
  ],
  [SCENARIO.capture]: [
    `. "$${HOOK}"`,
    'out=$(claude "$@")',
    'code=$?',
    `printf 'CAPTURED<<%s\\n>>\\n' "$out"`,
    'exit $code',
  ],
  [SCENARIO.stdinRest]: [
    `. "$${HOOK}"`,
    'claude "$@"',
    'code=$?',
    "printf 'REST<<'",
    'cat',
    "printf '>>\\n'",
    'exit $code',
  ],
  [SCENARIO.strict]: [`. "$${HOOK}"`, 'set -u', 'claude'],
  [SCENARIO.twoDirs]: [
    `. "$${HOOK}"`,
    'cd "$1" && claude',
    'cd "$2" && claude',
    'code=$?',
    `printf '${AFTER_FORMAT}' "\${CCPROFILE-<unset>}" "\${CCPROFILE_ACCOUNT-<unset>}" "\${CLAUDE_CONFIG_DIR-<unset>}" "\${CCPROFILE_ARGV-<unset>}"`,
    'exit $code',
  ],
}

// fish; the claude arguments are $argv.
const FISH_SCRIPT: Readonly<Record<Scenario, readonly string[]>> = {
  [SCENARIO.call]: [`source $${HOOK}`, 'claude $argv'],
  [SCENARIO.codex]: [
    `source $${HOOK}`,
    'codex $argv',
    'set -l code $status',
    'if set -q CODEX_HOME',
    '    echo "AFTER CODEX_HOME=$CODEX_HOME"',
    'else',
    "    echo 'AFTER CODEX_HOME=<unset>'",
    'end',
    'exit $code',
  ],
  [SCENARIO.capture]: [
    `source $${HOOK}`,
    'set -l out (claude $argv)',
    'set -l code $status',
    "printf 'CAPTURED<<'",
    "printf '%s\\n' $out",
    "printf '>>\\n'",
    'exit $code',
  ],
  [SCENARIO.stdinRest]: [
    `source $${HOOK}`,
    'claude $argv',
    'set -l code $status',
    "printf 'REST<<'",
    'cat',
    "printf '>>\\n'",
    'exit $code',
  ],
  [SCENARIO.strict]: [`source $${HOOK}`, 'claude'],
  [SCENARIO.twoDirs]: [
    `source $${HOOK}`,
    'cd $argv[1]; and claude',
    'cd $argv[2]; and claude',
    'set -l code $status',
    'function show',
    '    set -l name $argv[1]',
    '    if set -q $name',
    '        echo $$name',
    '    else',
    "        echo '<unset>'",
    '    end',
    'end',
    `printf '${AFTER_FORMAT}' (show CCPROFILE) (show CCPROFILE_ACCOUNT) (show CLAUDE_CONFIG_DIR) (show CCPROFILE_ARGV)`,
    'exit $code',
  ],
}

// pwsh and powershell; the claude arguments are the string array $a. Output
// goes through [Console]::Out so PowerShell adds no CRLF or formatting.
const POWERSHELL_SCRIPT: Readonly<Record<Scenario, readonly string[]>> = {
  [SCENARIO.call]: ['claude @a', 'exit $LASTEXITCODE'],
  [SCENARIO.codex]: [
    'codex @a',
    '$code = $LASTEXITCODE',
    "$codexHome = [Environment]::GetEnvironmentVariable('CODEX_HOME')",
    "if ($null -eq $codexHome) { $codexHome = '<unset>' }",
    '[Console]::Out.Write(\'AFTER CODEX_HOME=\' + $codexHome + "`n")',
    'exit $code',
  ],
  [SCENARIO.capture]: [
    '$out = claude @a',
    '$code = $LASTEXITCODE',
    '$text = -join @($out | ForEach-Object { [string]$_ + "`n" })',
    '[Console]::Out.Write(\'CAPTURED<<\' + $text + ">>`n")',
    'exit $code',
  ],
  // Unread stdin is not checked here: PowerShell owns its stdin.
  [SCENARIO.stdinRest]: ['claude @a', 'exit $LASTEXITCODE'],
  [SCENARIO.strict]: [
    'Set-StrictMode -Version Latest',
    'claude',
    'exit $LASTEXITCODE',
  ],
  [SCENARIO.twoDirs]: [
    'function Show-Env([string]$Name) {',
    '    $value = [Environment]::GetEnvironmentVariable($Name)',
    "    if ($null -eq $value) { '<unset>' } else { $value }",
    '}',
    'Set-Location -LiteralPath $a[0]',
    'claude',
    'Set-Location -LiteralPath $a[1]',
    'claude',
    '$code = $LASTEXITCODE',
    "[Console]::Out.Write('AFTER CCPROFILE=' + (Show-Env 'CCPROFILE') + ' CCPROFILE_ACCOUNT=' + (Show-Env 'CCPROFILE_ACCOUNT') + ' CLAUDE_CONFIG_DIR=' + (Show-Env 'CLAUDE_CONFIG_DIR') + ' CCPROFILE_ARGV=' + (Show-Env 'CCPROFILE_ARGV') + \"`n\")",
    'exit $code',
  ],
}

const SCRIPTS: Readonly<
  Record<Shell, Readonly<Record<Scenario, readonly string[]>>>
> = {
  zsh: POSIX_SCRIPT,
  bash: POSIX_SCRIPT,
  fish: FISH_SCRIPT,
  pwsh: POWERSHELL_SCRIPT,
  powershell: POWERSHELL_SCRIPT,
}

// The script body a shell runs after startup for one scenario. PowerShell
// scripts expect the hook to be dot-sourced and $a to be set by the driver.
const scenarioScript = (shell: Shell, scenario: Scenario): string =>
  SCRIPTS[shell][scenario].join('\n')

export default scenarioScript
