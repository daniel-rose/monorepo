// `ccprofile switch` and `ccprofile handoff` (spec §6): the plan the mod
// asks for, and the handoff file the mod leaves for the hook at /exit.
const SWITCH = {
  // The JSON line of `switch --json`.
  planVersion: 1,
  // The handoff file the mod writes to CCPROFILE_HANDOFF.
  handoffVersion: 1,
  // What `claude --resume` takes; nothing else reaches the hook's command
  // line.
  sessionIdPattern:
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  // How much of the session id the messages show.
  shortIdLength: 8,
} as const

export default SWITCH
