# ccprofile hook v4
# Starts Claude Code and the Codex CLI with the profile and account
# `ccprofile resolve` picks for the current directory. CCPROFILE,
# CCPROFILE_ACCOUNT and CLAUDE_CONFIG_DIR (claude) or CODEX_HOME (codex) are
# set for the tool only, never in this shell. After /ccprofile-switch and
# /exit in claude, the session goes on with the next account. Bypass with
# `command claude` or `command codex`.

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
    # `handoff` adds a fifth field, the session to resume.
    set -l ccprofile_parts (string split -m 3 \t -- $ccprofile_out[1])

    if test $ccprofile_tool = codex
        # `set -lx` is local to its block, so every branch starts codex itself.
        set -lx CCPROFILE $ccprofile_parts[1]
        set -lx CCPROFILE_ACCOUNT $ccprofile_parts[2]
        if test -z "$ccprofile_parts[3]"
            command codex $argv
        else
            set -lx CODEX_HOME $ccprofile_parts[3]
            command codex $argv
        end
        return $status
    end

    # claude gets an empty file in CCPROFILE_HANDOFF, fresh per start. The mod
    # fills it at /exit after /ccprofile-switch; then `handoff` prints the
    # account and session to resume, and the loop starts claude again.
    set -l ccprofile_args $argv
    set -l ccprofile_tmp /tmp
    if test -n "$TMPDIR"
        set ccprofile_tmp $TMPDIR
    end
    while true
        # The `=` form: --mcp-config is variadic and would eat the next
        # arguments. Before the user's arguments, or a user `--` would
        # swallow it.
        if test -n "$ccprofile_parts[4]"
            set ccprofile_args "--mcp-config=$ccprofile_parts[4]" $ccprofile_args
        end

        set -l ccprofile_handoff (command mktemp "$ccprofile_tmp/ccprofile-handoff.XXXXXX" 2>/dev/null)
        or set ccprofile_handoff ''
        # `set -lx` is local to its block (an `if` too), so each branch
        # starts claude itself.
        begin
            set -lx CCPROFILE $ccprofile_parts[1]
            set -lx CCPROFILE_ACCOUNT $ccprofile_parts[2]
            set -lx CCPROFILE_HANDOFF "$ccprofile_handoff"
            if test -n "$ccprofile_parts[3]"
                set -lx CLAUDE_CONFIG_DIR $ccprofile_parts[3]
                command claude $ccprofile_args
            else
                command claude $ccprofile_args
            end
        end
        set -l ccprofile_status $status

        set -l ccprofile_next
        if test -n "$ccprofile_handoff"; and test -s "$ccprofile_handoff"
            set ccprofile_next (env CCPROFILE=$ccprofile_parts[1] CCPROFILE_ACCOUNT=$ccprofile_parts[2] \
                ccprofile handoff --protocol 2 --file "$ccprofile_handoff")
        end
        if test -n "$ccprofile_handoff"
            command rm -f -- "$ccprofile_handoff"
        end
        if not set -q ccprofile_next[1]; or test -z "$ccprofile_next[1]"
            return $ccprofile_status
        end

        set ccprofile_parts (string split -m 4 \t -- $ccprofile_next[1])
        # The original arguments are not repeated: they could resend a prompt.
        set ccprofile_args --resume $ccprofile_parts[5]
    end
end
