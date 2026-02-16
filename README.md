# Monorepo

[![License](https://img.shields.io/npm/l/@daniel-rose/envex.svg)](https://github.com/daniel-rose/envex/blob/main/LICENSE)

Monorepo for envex and shared configurations.

## Packages

| Package | Description |
|---------|-------------|
| [@daniel-rose/envex](./packages/envex) | Runtime environment variables for Next.js |
| [@daniel-rose/eslint-config](./configs/eslint) | Shared ESLint configuration |
| [@daniel-rose/prettier-config](./configs/prettier) | Shared Prettier configuration |
| [@daniel-rose/semantic-release-config](./configs/semantic-release) | Shared semantic-release configuration |

## Monorepo Structure

```text
envex/
├─ packages/envex/           # main library
├─ configs/eslint/           # ESLint config
├─ configs/prettier/         # Prettier config
├─ configs/semantic-release/ # semantic-release config
└─ examples/nextjs/          # example Next.js integration
```

## Development

```bash
# install dependencies
pnpm install

# build all packages
pnpm build

# run tests
pnpm test
```

## License

MIT &copy; Daniel Rose

Links

- GitHub: https://github.com/daniel-rose/monorepo
