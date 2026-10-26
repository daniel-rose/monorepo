# ccprofile hook v4
# Starts Claude Code and the Codex CLI with the profile and account
# `ccprofile resolve` picks for the current directory. CCPROFILE,
# CCPROFILE_ACCOUNT and CLAUDE_CONFIG_DIR (claude) or CODEX_HOME (codex) are
# set for the tool only and restored afterwards. After /ccprofile-switch and
# /exit in claude, the session goes on with the next account. Bypass with
# `& (Get-Command claude -CommandType Application)[0]` (codex alike).
#
# Keep this file ASCII: Windows PowerShell 5.1 reads files without a BOM as
# ANSI, so non-ASCII text is built from char codes.

function claude {
    __ccprofile_run 'claude' $args
}

function codex {
    __ccprofile_run 'codex' $args
}

# __ccprofile_run <tool> <args array>
function __ccprofile_run {
    param([string]$ccprofileTool, [object[]]$ccprofileArgs)
    # @($null) would be one argument, so no arguments stay none.
    $toolArgs = if ($null -eq $ccprofileArgs) { @() } else { @($ccprofileArgs) }

    $ccprofile = Get-Command -Name ccprofile -CommandType ExternalScript, Application -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($null -eq $ccprofile) {
        [Console]::Error.WriteLine(
            'ccprofile: ccprofile not found ' + [char]0x2013 +
            ' run "& (Get-Command ' + $ccprofileTool + ' -CommandType Application)[0]" to bypass')
        $global:LASTEXITCODE = 127
        return
    }

    # The npm shims lose `--` (.ps1) or empty strings (.cmd), so the
    # arguments travel as a JSON array in CCPROFILE_ARGV, set only for this
    # call. Fresh strings keep PowerShell's extra properties out of the JSON.
    $argv = @(foreach ($arg in $toolArgs) { [string]::new(([string]$arg).ToCharArray()) })
    $previousArgv = $env:CCPROFILE_ARGV
    $previousEncoding = $null
    try {
        $env:CCPROFILE_ARGV = ConvertTo-Json -InputObject @($argv) -Compress
        # resolve prints UTF-8; decode it as such (non-ASCII profile paths).
        # Hosts without a console (ISE, remoting) cannot switch and keep
        # their encoding.
        try {
            $previousEncoding = [Console]::OutputEncoding
            [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
        } catch { }
        $out = & $ccprofile resolve --protocol 2 --tool $ccprofileTool --
        $code = $LASTEXITCODE
    } finally {
        $env:CCPROFILE_ARGV = $previousArgv
        if ($null -ne $previousEncoding) {
            try { [Console]::OutputEncoding = $previousEncoding } catch { }
        }
    }
    if ($code -ne 0) {
        $global:LASTEXITCODE = $code
        return
    }

    $toolCommand = Get-Command -Name $ccprofileTool -CommandType Application -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($null -eq $toolCommand) {
        [Console]::Error.WriteLine("ccprofile: $ccprofileTool not found")
        $global:LASTEXITCODE = 127
        return
    }

    # Empty output: start the tool unchanged. Otherwise
    # `name<TAB>account<TAB>dir<TAB>mcpConfig`; -split keeps empty fields.
    # codex never gets an mcpConfig.
    $line = [string]($out | Select-Object -First 1)
    $name, $account, $dir, $mcpConfig = $line -split "`t", 4

    # Legacy argument passing (Windows PowerShell 5.1, and .cmd/.bat under
    # the default `Windows` mode of PowerShell 7.3+) drops empty strings, so
    # they are passed as a literal "".
    $passing = Get-Variable -Name PSNativeCommandArgumentPassing -ValueOnly -ErrorAction SilentlyContinue
    $legacy = $PSVersionTable.PSVersion.Major -lt 7 -or "$passing" -eq 'Legacy' -or
        ("$passing" -eq 'Windows' -and $toolCommand.Extension -in '.bat', '.cmd')
    $nativeArgs = @(foreach ($arg in $toolArgs) {
        if ($legacy -and [string]$arg -eq '') { '""' } else { $arg }
    })
    # claude with a profile gets an empty file in CCPROFILE_HANDOFF, fresh per
    # start. The mod fills it at /exit after /ccprofile-switch; then `handoff`
    # prints the account and session to resume
    # (`name<TAB>account<TAB>dir<TAB>mcpConfig<TAB>sessionId`), and the loop
    # starts claude again.
    $switches = $name -and $ccprofileTool -eq 'claude'

    # `$env:X = $null` removes the variable. [Environment]::SetEnvironmentVariable
    # would not: PowerShell passes $null to a string parameter as "", which
    # .NET (PowerShell 7) keeps as an empty value.
    $previousProfile = $env:CCPROFILE
    $previousAccount = $env:CCPROFILE_ACCOUNT
    $previousConfigDir = $env:CLAUDE_CONFIG_DIR
    $previousCodexHome = $env:CODEX_HOME
    $previousHandoff = $env:CCPROFILE_HANDOFF
    $exitCode = 0
    while ($true) {
        # The `=` form: --mcp-config is variadic and would eat the next
        # arguments. Before the user's arguments, or a user `--` would
        # swallow it.
        $runArgs = @($nativeArgs)
        if ($mcpConfig) { $runArgs = @("--mcp-config=$mcpConfig") + $runArgs }

        $handoff = $null
        if ($switches) {
            try { $handoff = [System.IO.Path]::GetTempFileName() } catch { }
        }
        $next = $null
        try {
            if ($name) {
                $env:CCPROFILE = $name
                $env:CCPROFILE_ACCOUNT = $account
                if ($dir) {
                    if ($ccprofileTool -eq 'codex') { $env:CODEX_HOME = $dir } else { $env:CLAUDE_CONFIG_DIR = $dir }
                }
            }
            # Also without a file: an inherited handoff is not claude's.
            if ($switches) { $env:CCPROFILE_HANDOFF = $handoff }
            & $toolCommand @runArgs
            $exitCode = $LASTEXITCODE

            if ($handoff -and (Get-Item -LiteralPath $handoff -ErrorAction SilentlyContinue).Length -gt 0) {
                # handoff prints UTF-8, as resolve does.
                $previousEncoding = $null
                try {
                    try {
                        $previousEncoding = [Console]::OutputEncoding
                        [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
                    } catch { }
                    $next = & $ccprofile handoff --protocol 2 --file $handoff
                } finally {
                    if ($null -ne $previousEncoding) {
                        try { [Console]::OutputEncoding = $previousEncoding } catch { }
                    }
                }
            }
        } finally {
            $env:CCPROFILE = $previousProfile
            $env:CCPROFILE_ACCOUNT = $previousAccount
            $env:CLAUDE_CONFIG_DIR = $previousConfigDir
            $env:CODEX_HOME = $previousCodexHome
            $env:CCPROFILE_HANDOFF = $previousHandoff
            if ($handoff) { Remove-Item -LiteralPath $handoff -Force -ErrorAction SilentlyContinue }
        }

        $line = [string]($next | Select-Object -First 1)
        if (-not $line) { break }
        $name, $account, $dir, $mcpConfig, $sessionId = $line -split "`t", 5
        # The original arguments are not repeated: they could resend a prompt.
        $nativeArgs = @('--resume', $sessionId)
    }
    $global:LASTEXITCODE = $exitCode
}
