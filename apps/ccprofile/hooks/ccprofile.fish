# ccprofile hook v3
# Starts Claude Code and the Codex CLI with the profile and account
# `ccprofile resolve` picks for the current directory. CCPROFILE,
# CCPROFILE_ACCOUNT and CLAUDE_CONFIG_DIR (claude) or CODEX_HOME (codex) are
# set for the tool only, never in this shell. Bypass with `command claude` or
# `command codex`.

function claude --description 'Start Claude Code with the ccprofile profile'
    __ccprofile_run claude $argv
end

function codex --description 'Start the Codex CLI with the ccprofile profile'
    __ccprofile_run codex $argv
end

# __ccprofile_run <tool> <args...>
function __ccprofile_run
    set -l ccprofile_tool $argv[1]
    set -e argv[1]

    if not command -q ccprofile
        echo "ccprofile: ccprofile not found – run \"command $ccprofile_tool\" to bypass" >&2
        return 127
    end

    # The locals carry a prefix: a fish local hides an exported variable of the
    # same name from the tool, so a plain `out` would drop the user's variable
    # from its environment.
    #
    # stdout is the profile line; prompts and messages go to stderr.
    set -l ccprofile_out (command ccprofile resolve --protocol 2 --tool $ccprofile_tool -- $argv)
    or return $status

    if not set -q ccprofile_out[1]
        command $ccprofile_tool $argv
        return $status
    end

    # `name<TAB>account<TAB>dir<TAB>mcpConfig`; `string split` keeps empty
    # fields, so all four are always there. codex never gets an mcpConfig.
    set -l ccprofile_parts (string split -m 3 \t -- $ccprofile_out[1])

    # The `=` form: --mcp-config is variadic and would eat the next arguments.
    # Before the user's arguments, or a user `--` would swallow it.
    set -l ccprofile_args $argv
    if test -n "$ccprofile_parts[4]"
        set ccprofile_args "--mcp-config=$ccprofile_parts[4]" $argv
    end

    # `set -lx` is local to its block, so every branch starts the tool itself.
    set -lx CCPROFILE $ccprofile_parts[1]
    set -lx CCPROFILE_ACCOUNT $ccprofile_parts[2]
    if test -z "$ccprofile_parts[3]"
        command $ccprofile_tool $ccprofile_args
    else if test $ccprofile_tool = codex
        set -lx CODEX_HOME $ccprofile_parts[3]
        command codex $ccprofile_args
    else
        set -lx CLAUDE_CONFIG_DIR $ccprofile_parts[3]
        command claude $ccprofile_args
    end
end
