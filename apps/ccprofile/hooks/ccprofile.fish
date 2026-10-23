# ccprofile hook v1
# Starts Claude Code with the profile `ccprofile resolve` picks for the current
# directory. CCPROFILE and CLAUDE_CONFIG_DIR are set for claude only, never in
# this shell. Bypass with `command claude`.

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
    set -l ccprofile_out (command ccprofile resolve -- $argv)
    or return $status

    # `set -lx` is local to its block, so every branch starts claude itself.
    if not set -q ccprofile_out[1]
        command claude $argv
    else
        set -l ccprofile_parts (string split -m 1 \t -- $ccprofile_out[1])
        set -lx CCPROFILE $ccprofile_parts[1]
        if test -n "$ccprofile_parts[2]"
            set -lx CLAUDE_CONFIG_DIR $ccprofile_parts[2]
            command claude $argv
        else
            command claude $argv
        end
    end
end
