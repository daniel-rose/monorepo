# ccprofile hook v2
# Starts Claude Code with the profile and account `ccprofile resolve` picks for
# the current directory. CCPROFILE, CCPROFILE_ACCOUNT and CLAUDE_CONFIG_DIR are
# set for claude only, never in this shell. Bypass with `command claude`.

function claude --description 'Start Claude Code with the ccprofile profile'
    if not command -q ccprofile
        echo 'ccprofile: ccprofile not found – run "command claude" to bypass' >&2
        return 127
    end

    # The locals carry a prefix: a fish local hides an exported variable of the
    # same name from claude, so a plain `out` would drop the user's variable
    # from claude's environment.
    #
    # stdout is the profile line; prompts and messages go to stderr.
    set -l ccprofile_out (command ccprofile resolve --protocol 2 -- $argv)
    or return $status

    if not set -q ccprofile_out[1]
        command claude $argv
        return $status
    end

    # `name<TAB>account<TAB>configDir<TAB>mcpConfig`; `string split` keeps
    # empty fields, so all four are always there.
    set -l ccprofile_parts (string split -m 3 \t -- $ccprofile_out[1])

    # The `=` form: --mcp-config is variadic and would eat the next arguments.
    # Before the user's arguments, or a user `--` would swallow it.
    set -l ccprofile_args $argv
    if test -n "$ccprofile_parts[4]"
        set ccprofile_args "--mcp-config=$ccprofile_parts[4]" $argv
    end

    # `set -lx` is local to its block, so every branch starts claude itself.
    set -lx CCPROFILE $ccprofile_parts[1]
    set -lx CCPROFILE_ACCOUNT $ccprofile_parts[2]
    if test -n "$ccprofile_parts[3]"
        set -lx CLAUDE_CONFIG_DIR $ccprofile_parts[3]
        command claude $ccprofile_args
    else
        command claude $ccprofile_args
    end
end
