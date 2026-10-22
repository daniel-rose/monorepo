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

  # stdout is the profile line; prompts and messages go to stderr.
  local out
  out=$(command ccprofile resolve -- "$@") || return

  local tab=$'\t'
  local name=${out%%$tab*}
  local dir=${out#*$tab}

  if [[ -z $out ]]; then
    command claude "$@"
  elif [[ -z $dir ]]; then
    CCPROFILE=$name command claude "$@"
  else
    CCPROFILE=$name CLAUDE_CONFIG_DIR=$dir command claude "$@"
  fi
}
