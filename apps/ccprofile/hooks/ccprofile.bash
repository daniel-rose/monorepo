# ccprofile hook v1
# Starts Claude Code with the profile `ccprofile resolve` picks for the current
# directory. CCPROFILE and CLAUDE_CONFIG_DIR are set for claude only, never in
# this shell. Bypass with `command claude`. Works with bash 3.2 (macOS).

function claude {
  if ! type -P ccprofile >/dev/null; then
    printf '%s\n' 'ccprofile: ccprofile not found – run "command claude" to bypass' >&2
    return 127
  fi

  # The locals carry a prefix: bash 3.2 gives a `local` the export attribute
  # of an exported variable with the same name, so a plain `out` or `name`
  # would overwrite the user's variable in claude's environment.
  #
  # stdout is the profile line; prompts and messages go to stderr. `local`
  # on its own line, or it would mask the exit status of resolve.
  # ${1+"$@"}: no "unbound variable" for zero arguments under `set -u` in
  # old bash versions.
  local ccprofile_out
  ccprofile_out=$(command ccprofile resolve -- ${1+"$@"}) || return

  local ccprofile_tab=$'\t'
  local ccprofile_name=${ccprofile_out%%"$ccprofile_tab"*}
  local ccprofile_dir=${ccprofile_out#*"$ccprofile_tab"}

  if [ -z "$ccprofile_out" ]; then
    command claude ${1+"$@"}
  elif [ -z "$ccprofile_dir" ]; then
    CCPROFILE=$ccprofile_name command claude ${1+"$@"}
  else
    CCPROFILE=$ccprofile_name CLAUDE_CONFIG_DIR=$ccprofile_dir command claude ${1+"$@"}
  fi
}
