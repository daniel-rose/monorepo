#!/bin/sh
# Fake claude for the shell tests (installed as `claude`). Reports its
# environment and arguments on stdout and appends the same report to
# $FAKE_CLAUDE_LOG, then exits with $FAKE_CLAUDE_EXIT.

report() {
  printf 'CCPROFILE=%s\n' "${CCPROFILE-}"
  printf 'CLAUDE_CONFIG_DIR=%s\n' "${CLAUDE_CONFIG_DIR-}"
  printf 'CCPROFILE_ARGV=%s\n' "${CCPROFILE_ARGV-}"
  for arg in "$@"; do
    printf 'ARG<<%s>>\n' "$arg"
  done
}

report "$@"
if [ -n "${FAKE_CLAUDE_LOG-}" ]; then
  report "$@" >>"$FAKE_CLAUDE_LOG"
fi
exit "${FAKE_CLAUDE_EXIT:-0}"
