// The published schema of one major; `init` writes the installed major,
// doctor compares the config's `@<major>` with it.
const SCHEMA_URL = (major: number): string =>
  `https://unpkg.com/@daniel-rose/ccprofile@${major}/schema.json`

export default SCHEMA_URL
