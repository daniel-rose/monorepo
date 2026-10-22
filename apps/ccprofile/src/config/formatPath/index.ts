// `profiles[1].remotes[0]`: dots between keys, `[n]` for array indices.
const formatPath = (path: readonly PropertyKey[]): string =>
  path.reduce<string>((text, key) => {
    if (typeof key === 'number') return `${text}[${key}]`
    const name = String(key)
    return text === '' ? name : `${text}.${name}`
  }, '')

export default formatPath
