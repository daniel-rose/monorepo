const CONFIG_FILE = {
  appDirName: 'ccprofile',
  fileName: 'config.json',
  defaultXdgDirName: '.config',
  windowsRoamingDirNames: ['AppData', 'Roaming'],
  claudeDirName: '.claude',
  byteOrderMark: '﻿',
  homeMarker: '~',
} as const

export default CONFIG_FILE
