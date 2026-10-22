# ccprofile hook v1
# Starts Claude Code with the profile `ccprofile resolve` picks for the current
# directory. CCPROFILE and CLAUDE_CONFIG_DIR are set for claude only, never in
# this shell. Bypass with `command claude`. Works with bash 3.2 (macOS).

function claude {
  if ! type -P ccprofile >/dev/null; then
    printf '%s\n' 'ccprofile: ccprofile not found – run "command claude" to bypass' >&2
    return 127
  fi

  # stdout is the profile line; prompts and messages go to stderr. `local`
  # on its own line, or it would mask the exit status of resolve.
  # ${1+"$@"}: no "unbound variable" for zero arguments under `set -u` in
  # old bash versions.
  local out
  out=$(command ccprofile resolve -- ${1+"$@"}) || return

  local tab=$'\t'
  local name=${out%%"$tab"*}
  local dir=${out#*"$tab"}

  if [ -z "$out" ]; then
    command claude ${1+"$@"}
  elif [ -z "$dir" ]; then
    CCPROFILE=$name command claude ${1+"$@"}
  else
    CCPROFILE=$name CLAUDE_CONFIG_DIR=$dir command claude ${1+"$@"}
  fi
}
