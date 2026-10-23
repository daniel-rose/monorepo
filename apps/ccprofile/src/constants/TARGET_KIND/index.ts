// `block`: a marker block in a startup file; `file`: the file itself is the
// integration (fish conf.d).
const TARGET_KIND = {
  block: 'block',
  file: 'file',
} as const

export default TARGET_KIND
