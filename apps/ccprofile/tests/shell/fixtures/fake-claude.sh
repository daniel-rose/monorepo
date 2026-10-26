#!/bin/sh
# Fake claude for the shell tests (installed as `claude` and as `codex`).
# Reports its environment, its name and arguments on stdout and appends the
# same report to $FAKE_CLAUDE_LOG, then exits with $FAKE_CLAUDE_EXIT.

report() {
  printf 'CCPROFILE=%s\n' "${CCPROFILE-}"
  printf 'CCPROFILE_ACCOUNT=%s\n' "${CCPROFILE_ACCOUNT-}"
  printf 'CLAUDE_CONFIG_DIR=%s\n' "${CLAUDE_CONFIG_DIR-}"
  printf 'CODEX_HOME=%s\n' "${CODEX_HOME-}"
  printf 'CCPROFILE_ARGV=%s\n' "${CCPROFILE_ARGV-}"
  printf 'TOOL=%s\n' "$(basename "$0")"
  for arg in "$@"; do
    printf 'ARG<<%s>>\n' "$arg"
  done
}

report "$@"
if [ -n "${FAKE_CLAUDE_LOG-}" ]; then
  report "$@" >>"$FAKE_CLAUDE_LOG"
  # The whole environment of the last run, for leak checks.
  env >"$FAKE_CLAUDE_LOG.env"
fi
# With FAKE_CLAUDE_HANDOFF, the first run writes it into the hook's handoff
# file, as the mod does at /exit after /ccprofile-switch, and keeps the
# file's path in $FAKE_CLAUDE_LOG.handoff.
if [ -n "${FAKE_CLAUDE_HANDOFF-}" ] && [ -n "${CCPROFILE_HANDOFF-}" ] &&
  [ ! -e "$FAKE_CLAUDE_LOG.handoff" ]; then
  printf '%s' "$FAKE_CLAUDE_HANDOFF" >"$CCPROFILE_HANDOFF"
  printf '%s' "$CCPROFILE_HANDOFF" >"$FAKE_CLAUDE_LOG.handoff"
fi
exit "${FAKE_CLAUDE_EXIT:-0}"
