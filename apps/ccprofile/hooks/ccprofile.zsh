# ccprofile hook v1
# Starts Claude Code with the profile `ccprofile resolve` picks for the current
# directory. CCPROFILE and CLAUDE_CONFIG_DIR are set for claude only, never in
# this shell. Bypass with `command claude`.

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
  ccprofile_out=$(command ccprofile resolve -- "$@") || return

  local ccprofile_tab=$'\t'
  local ccprofile_name=${ccprofile_out%%$ccprofile_tab*}
  local ccprofile_dir=${ccprofile_out#*$ccprofile_tab}

  if [[ -z $ccprofile_out ]]; then
    command claude "$@"
  elif [[ -z $ccprofile_dir ]]; then
    CCPROFILE=$ccprofile_name command claude "$@"
  else
    CCPROFILE=$ccprofile_name CLAUDE_CONFIG_DIR=$ccprofile_dir command claude "$@"
  fi
}
