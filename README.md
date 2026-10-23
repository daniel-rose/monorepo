# Monorepo

[![License](https://img.shields.io/npm/l/@daniel-rose/envex.svg)](https://github.com/daniel-rose/envex/blob/main/LICENSE)

Monorepo for envex and shared configurations.

## Packages

| Package | Description |
|---------|-------------|
| [@daniel-rose/envex](./packages/envex) | Runtime environment variables for React applications |
| [@daniel-rose/ccprofile](./apps/ccprofile) | Start Claude Code with the right profile per directory or git remote |
| [@daniel-rose/eslint-config](./configs/eslint) | Shared ESLint configuration |
| [@daniel-rose/prettier-config](./configs/prettier) | Shared Prettier configuration |
| [@daniel-rose/semantic-release-config](./configs/semantic-release) | Shared semantic-release configuration |

## Monorepo Structure

```text
envex/
├─ packages/envex/           # main library
├─ apps/ccprofile/           # ccprofile CLI
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

## Publishing a new package

npm trusted publishing (OIDC) cannot create a package, so the first release of a new package goes out with a short-lived token. The release job already sets `NPM_CONFIG_PROVENANCE`.

1. Create a granular access token on npmjs.com: scope `@daniel-rose`, read and write, bypass 2FA, expiry 7 days. Store it with `gh secret set NPM_TOKEN -R daniel-rose/monorepo`.
2. Merge the PR that adds the package. The release job publishes `1.0.0` through the token fallback of the publish plugin, with provenance. Check that the package is public, that the tarball contents are right and that the provenance badge shows.
3. Revoke the token, run `gh secret delete NPM_TOKEN`, and remove `NPM_TOKEN` and `NODE_AUTH_TOKEN` from `.github/workflows/release.yml` (a `chore` commit).
4. Right before the next release of the package is mergeable, add the trusted publisher: `npm trust github @daniel-rose/<package> --repo daniel-rose/monorepo --file release.yml --allow-publish`. Merge within 48 hours.
5. Check `npm view @daniel-rose/<package> _npmUser`: it must be the GitHub Actions OIDC user. Then set the package to "Require 2FA and disallow tokens".

If the publish in step 4 fails because the trust expired or is wrong, recreate it with the command above and rerun the release job. As a last resort create a new 7-day token as in step 1.

From January 2027 npm ends direct token publishing. Then use `npm stage publish` or an OIDC trust on the whole namespace instead of the token fallback.

## License

MIT &copy; Daniel Rose

## Links

- [GitHub](https://github.com/daniel-rose/monorepo)
