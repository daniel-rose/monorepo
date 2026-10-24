# ccprofile hook v2
# Starts Claude Code with the profile and account `ccprofile resolve` picks for
# the current directory. CCPROFILE, CCPROFILE_ACCOUNT and CLAUDE_CONFIG_DIR are
# set for claude only and restored afterwards. Bypass with
# `& (Get-Command claude -CommandType Application)[0]`.
#
# Keep this file ASCII: Windows PowerShell 5.1 reads files without a BOM as
# ANSI, so non-ASCII text is built from char codes.

function claude {
    $ccprofile = Get-Command -Name ccprofile -CommandType ExternalScript, Application -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($null -eq $ccprofile) {
        [Console]::Error.WriteLine(
            'ccprofile: ccprofile not found ' + [char]0x2013 +
            ' run "& (Get-Command claude -CommandType Application)[0]" to bypass')
        $global:LASTEXITCODE = 127
        return
    }

    # The npm shims lose `--` (.ps1) or empty strings (.cmd), so the
    # arguments travel as a JSON array in CCPROFILE_ARGV, set only for this
    # call. Fresh strings keep PowerShell's extra properties out of the JSON.
    $argv = @(foreach ($arg in $args) { [string]::new(([string]$arg).ToCharArray()) })
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
        $out = & $ccprofile resolve --protocol 2 --
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

    $claudeCommand = Get-Command -Name claude -CommandType Application -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($null -eq $claudeCommand) {
        [Console]::Error.WriteLine('ccprofile: claude not found')
        $global:LASTEXITCODE = 127
        return
    }

    # Empty output: start claude unchanged. Otherwise
    # `name<TAB>account<TAB>configDir<TAB>mcpConfig`; -split keeps empty
    # fields.
    $line = [string]($out | Select-Object -First 1)
    $name, $account, $configDir, $mcpConfig = $line -split "`t", 4

    # Legacy argument passing (Windows PowerShell 5.1, and .cmd/.bat under
    # the default `Windows` mode of PowerShell 7.3+) drops empty strings, so
    # they are passed as a literal "".
    $passing = Get-Variable -Name PSNativeCommandArgumentPassing -ValueOnly -ErrorAction SilentlyContinue
    $legacy = $PSVersionTable.PSVersion.Major -lt 7 -or "$passing" -eq 'Legacy' -or
        ("$passing" -eq 'Windows' -and $claudeCommand.Extension -in '.bat', '.cmd')
    $claudeArgs = @(foreach ($arg in $args) {
        if ($legacy -and [string]$arg -eq '') { '""' } else { $arg }
    })
    # The `=` form: --mcp-config is variadic and would eat the next
    # arguments. Before the user's arguments, or a user `--` would swallow it.
    if ($mcpConfig) { $claudeArgs = @("--mcp-config=$mcpConfig") + $claudeArgs }

    $previousProfile = $env:CCPROFILE
    $previousAccount = $env:CCPROFILE_ACCOUNT
    $previousConfigDir = $env:CLAUDE_CONFIG_DIR
    $exitCode = 0
    try {
        if ($name) {
            $env:CCPROFILE = $name
            $env:CCPROFILE_ACCOUNT = $account
            if ($configDir) { $env:CLAUDE_CONFIG_DIR = $configDir }
        }
        & $claudeCommand @claudeArgs
        $exitCode = $LASTEXITCODE
    } finally {
        $env:CCPROFILE = $previousProfile
        $env:CCPROFILE_ACCOUNT = $previousAccount
        $env:CLAUDE_CONFIG_DIR = $previousConfigDir
    }
    $global:LASTEXITCODE = $exitCode
}
