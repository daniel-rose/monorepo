// The given variables of the test runner's environment that are set.
const pickEnv = (keys: readonly string[]): Record<string, string> =>
  Object.fromEntries(
    keys.flatMap(key => {
      const value = process.env[key]
      return value === undefined ? [] : [[key, value]]
    })
  )

export default pickEnv
