import SCHEMA_URL from '../SCHEMA_URL'

// The example of the design spec, section 5.
const EXAMPLE_CONFIG = {
  $schema: SCHEMA_URL,
  onUnknown: 'prompt',
  passthrough: ['--version', '-v', '--help', '-h', 'update'],
  profiles: [
    { name: 'work', remotes: ['gitlab.example.com', 'github.com/acme'] },
    {
      name: 'private',
      configDir: '~/.claude-private',
      remotes: ['github.com/jane'],
      paths: ['~/Projects/private'],
    },
  ],
} as const

export default EXAMPLE_CONFIG
