import { existsSync, readFileSync } from 'node:fs'

// Parses the `<log>.env` file the fake claude writes: one `KEY=value` per
// line (values with line breaks are not supported). No file means claude was
// never started.
const readChildEnv = (logPath: string): Record<string, string> => {
  const envPath = `${logPath}.env`
  if (!existsSync(envPath)) return {}

  return Object.fromEntries(
    readFileSync(envPath, 'utf8')
      .split('\n')
      .flatMap(line => {
        const separator = line.indexOf('=')
        return separator < 1
          ? []
          : [[line.slice(0, separator), line.slice(separator + 1)]]
      })
  )
}

export default readChildEnv
