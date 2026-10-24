# ccprofile hook v3
# Starts Claude Code and the Codex CLI with the profile and account
# `ccprofile resolve` picks for the current directory. CCPROFILE,
# CCPROFILE_ACCOUNT and CLAUDE_CONFIG_DIR (claude) or CODEX_HOME (codex) are
# set for the tool only, never in this shell. Bypass with `command claude` or
# `command codex`.

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
  # fields keep their place. codex never gets an mcpConfig.
  local ccprofile_tab=$'\t'
  local ccprofile_rest=$ccprofile_out
  local ccprofile_name=${ccprofile_rest%%$ccprofile_tab*}
  ccprofile_rest=${ccprofile_rest#*$ccprofile_tab}
  local ccprofile_account=${ccprofile_rest%%$ccprofile_tab*}
  ccprofile_rest=${ccprofile_rest#*$ccprofile_tab}
  local ccprofile_dir=${ccprofile_rest%%$ccprofile_tab*}
  local ccprofile_mcp=${ccprofile_rest#*$ccprofile_tab}

  # The `=` form: --mcp-config is variadic and would eat the next arguments.
  # Before the user's arguments, or a user `--` would swallow it.
  if [[ -n $ccprofile_mcp ]]; then
    set -- "--mcp-config=$ccprofile_mcp" "$@"
  fi

  if [[ -z $ccprofile_dir ]]; then
    CCPROFILE=$ccprofile_name CCPROFILE_ACCOUNT=$ccprofile_account \
      command $ccprofile_tool "$@"
  elif [[ $ccprofile_tool == codex ]]; then
    CCPROFILE=$ccprofile_name CCPROFILE_ACCOUNT=$ccprofile_account \
      CODEX_HOME=$ccprofile_dir command codex "$@"
  else
    CCPROFILE=$ccprofile_name CCPROFILE_ACCOUNT=$ccprofile_account \
      CLAUDE_CONFIG_DIR=$ccprofile_dir command claude "$@"
  fi
}
