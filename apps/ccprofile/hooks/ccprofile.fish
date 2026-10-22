# ccprofile hook v1
# Starts Claude Code with the profile `ccprofile resolve` picks for the current
# directory. CCPROFILE and CLAUDE_CONFIG_DIR are set for claude only, never in
# this shell. Bypass with `command claude`.

function claude --description 'Start Claude Code with the ccprofile profile'
    if not command -q ccprofile
        echo 'ccprofile: ccprofile not found – run "command claude" to bypass' >&2
        return 127
    end

    # stdout is the profile line; prompts and messages go to stderr.
    set -l out (command ccprofile resolve -- $argv)
    or return $status

    # `set -lx` is local to its block, so every branch starts claude itself.
    if not set -q out[1]
        command claude $argv
    else
        set -l parts (string split -m 1 \t -- $out[1])
        set -lx CCPROFILE $parts[1]
        if test -n "$parts[2]"
            set -lx CLAUDE_CONFIG_DIR $parts[2]
            command claude $argv
        else
            command claude $argv
        end
    end
end
