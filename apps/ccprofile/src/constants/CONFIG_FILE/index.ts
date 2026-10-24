const CONFIG_FILE = {
  appDirName: 'ccprofile',
  fileName: 'config.json',
  defaultXdgDirName: '.config',
  windowsRoamingDirNames: ['AppData', 'Roaming'],
  claudeDirName: '.claude',
  // The default CODEX_HOME.
  codexDirName: '.codex',
  // Codex profile files in a Codex home (`codex --profile <name>`).
  codexProfileSuffix: '.config.toml',
  // Cost-center MCP servers in the shared source, passed as --mcp-config.
  mcpConfigName: '.mcp.json',
  byteOrderMark: '﻿',
  homeMarker: '~',
} as const

export default CONFIG_FILE
