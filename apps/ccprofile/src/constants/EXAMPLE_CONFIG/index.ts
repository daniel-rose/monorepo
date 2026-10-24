// The example of the design spec, section 5. `init` puts the `$schema` of
// the installed major in front.
const EXAMPLE_CONFIG = {
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
