# ccprofile hook v2
# Starts Claude Code with the profile and account `ccprofile resolve` picks for
# the current directory. CCPROFILE, CCPROFILE_ACCOUNT and CLAUDE_CONFIG_DIR are
# set for claude only, never in this shell. Bypass with `command claude`.

function claude {
  emulate -L zsh

  if ! whence -p ccprofile >/dev/null; then
    print -ru2 -- 'ccprofile: ccprofile not found – run "command claude" to bypass'
    return 127
  fi

  # The locals carry a prefix: a zsh `local` hides an exported variable of the
  # same name from claude, so a plain `out` or `name` would drop the user's
  # variable from claude's environment.
  #
  # stdout is the profile line; prompts and messages go to stderr.
  local ccprofile_out
  ccprofile_out=$(command ccprofile resolve --protocol 2 -- "$@") || return

  if [[ -z $ccprofile_out ]]; then
    command claude "$@"
    return
  fi

  # `name<TAB>account<TAB>configDir<TAB>mcpConfig`, split field by field so
  # empty fields keep their place.
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
      command claude "$@"
  else
    CCPROFILE=$ccprofile_name CCPROFILE_ACCOUNT=$ccprofile_account \
      CLAUDE_CONFIG_DIR=$ccprofile_dir command claude "$@"
  fi
}
