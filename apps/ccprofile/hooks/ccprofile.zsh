# ccprofile hook v4
# Starts Claude Code and the Codex CLI with the profile and account
# `ccprofile resolve` picks for the current directory. CCPROFILE,
# CCPROFILE_ACCOUNT and CLAUDE_CONFIG_DIR (claude) or CODEX_HOME (codex) are
# set for the tool only, never in this shell. After /ccprofile-switch and
# /exit in claude, the session goes on with the next account. Bypass with
# `command claude` or `command codex`.

function claude {
  _ccprofile_run claude "$@"
}

function codex {
  _ccprofile_run codex "$@"
}

# _ccprofile_run <tool> <args...>
function _ccprofile_run {
  emulate -L zsh
  local ccprofile_tool=$1
  shift

  if ! whence -p ccprofile >/dev/null; then
    print -ru2 -- "ccprofile: ccprofile not found – run \"command $ccprofile_tool\" to bypass"
    return 127
  fi

  # The locals carry a prefix: a zsh `local` hides an exported variable of the
  # same name from the tool, so a plain `out` or `name` would drop the user's
  # variable from its environment.
  #
  # stdout is the profile line; prompts and messages go to stderr.
  local ccprofile_out
  ccprofile_out=$(command ccprofile resolve --protocol 2 --tool $ccprofile_tool -- "$@") || return

  if [[ -z $ccprofile_out ]]; then
    command $ccprofile_tool "$@"
    return
  fi

  # `name<TAB>account<TAB>dir<TAB>mcpConfig`, split field by field so empty
  # fields keep their place. codex never gets an mcpConfig. `handoff` adds a
  # fifth field, the session to resume.
  local ccprofile_tab=$'\t'
  local ccprofile_rest=$ccprofile_out
  local ccprofile_name=${ccprofile_rest%%$ccprofile_tab*}
  ccprofile_rest=${ccprofile_rest#*$ccprofile_tab}
  local ccprofile_account=${ccprofile_rest%%$ccprofile_tab*}
  ccprofile_rest=${ccprofile_rest#*$ccprofile_tab}
  local ccprofile_dir=${ccprofile_rest%%$ccprofile_tab*}
  local ccprofile_mcp=${ccprofile_rest#*$ccprofile_tab}

  if [[ $ccprofile_tool == codex ]]; then
    if [[ -z $ccprofile_dir ]]; then
      CCPROFILE=$ccprofile_name CCPROFILE_ACCOUNT=$ccprofile_account \
        command codex "$@"
    else
      CCPROFILE=$ccprofile_name CCPROFILE_ACCOUNT=$ccprofile_account \
        CODEX_HOME=$ccprofile_dir command codex "$@"
    fi
    return
  fi

  # claude gets an empty file in CCPROFILE_HANDOFF, fresh per start. The mod
  # fills it at /exit after /ccprofile-switch; then `handoff` prints the
  # account and session to resume, and the loop starts claude again.
  local ccprofile_handoff ccprofile_status ccprofile_session
  while true; do
    # The `=` form: --mcp-config is variadic and would eat the next
    # arguments. Before the user's arguments, or a user `--` would swallow it.
    if [[ -n $ccprofile_mcp ]]; then
      set -- "--mcp-config=$ccprofile_mcp" "$@"
    fi

    ccprofile_handoff=$(command mktemp "${TMPDIR:-/tmp}/ccprofile-handoff.XXXXXX" 2>/dev/null) ||
      ccprofile_handoff=
    # `|| status=$?`: a failing claude must not end the function under
    # ERR_EXIT before the handoff file is removed.
    ccprofile_status=0
    if [[ -z $ccprofile_dir ]]; then
      CCPROFILE=$ccprofile_name CCPROFILE_ACCOUNT=$ccprofile_account \
        CCPROFILE_HANDOFF=$ccprofile_handoff command claude "$@" ||
        ccprofile_status=$?
    else
      CCPROFILE=$ccprofile_name CCPROFILE_ACCOUNT=$ccprofile_account \
        CCPROFILE_HANDOFF=$ccprofile_handoff CLAUDE_CONFIG_DIR=$ccprofile_dir \
        command claude "$@" || ccprofile_status=$?
    fi

    ccprofile_out=
    if [[ -n $ccprofile_handoff && -s $ccprofile_handoff ]]; then
      ccprofile_out=$(CCPROFILE=$ccprofile_name CCPROFILE_ACCOUNT=$ccprofile_account \
        command ccprofile handoff --protocol 2 --file "$ccprofile_handoff")
    fi
    [[ -n $ccprofile_handoff ]] && command rm -f -- "$ccprofile_handoff"
    [[ -z $ccprofile_out ]] && return $ccprofile_status

    ccprofile_rest=$ccprofile_out
    ccprofile_name=${ccprofile_rest%%$ccprofile_tab*}
    ccprofile_rest=${ccprofile_rest#*$ccprofile_tab}
    ccprofile_account=${ccprofile_rest%%$ccprofile_tab*}
    ccprofile_rest=${ccprofile_rest#*$ccprofile_tab}
    ccprofile_dir=${ccprofile_rest%%$ccprofile_tab*}
    ccprofile_rest=${ccprofile_rest#*$ccprofile_tab}
    ccprofile_mcp=${ccprofile_rest%%$ccprofile_tab*}
    ccprofile_session=${ccprofile_rest#*$ccprofile_tab}
    # The original arguments are not repeated: they could resend a prompt.
    set -- --resume "$ccprofile_session"
  done
}
