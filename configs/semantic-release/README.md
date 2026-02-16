# @daniel-rose/semantic-release-config

> Shared semantic-release configuration

[![npm version](https://img.shields.io/npm/v/@daniel-rose/semantic-release-config.svg)](https://www.npmjs.com/package/@daniel-rose/semantic-release-config)
[![License](https://img.shields.io/npm/l/@daniel-rose/semantic-release-config.svg)](https://github.com/daniel-rose/envex/blob/main/LICENSE)

Standard semantic-release pipeline: commit-analyzer, release-notes, changelog, npm, git, and GitHub.

## Installation

```bash
# npm
npm install @daniel-rose/semantic-release-config

# yarn
yarn add @daniel-rose/semantic-release-config

# pnpm
pnpm add @daniel-rose/semantic-release-config
```

Peer dependency: `semantic-release ^25`

## Usage

In your `.releaserc.json`:

```json
{
  "extends": "@daniel-rose/semantic-release-config"
}
```

### Included Plugins

1. `@semantic-release/commit-analyzer`
2. `@semantic-release/release-notes-generator`
3. `@semantic-release/changelog`
4. `@semantic-release/npm`
5. `@semantic-release/git` — commits `package.json` and `CHANGELOG.md`
6. `@semantic-release/github`

## License

MIT &copy; Daniel Rose

Links

- GitHub: https://github.com/daniel-rose/envex
- npm: https://www.npmjs.com/package/@daniel-rose/semantic-release-config
