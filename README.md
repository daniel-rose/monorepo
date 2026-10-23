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

npm trusted publishing (OIDC) cannot create a package, so the first release of a new package goes out with a temporary granular token. The release job sets `PNPM_CONFIG_PROVENANCE` (pnpm 12 ignores `NPM_CONFIG_*`); provenance only needs the job's `id-token: write`, not trusted publishing. Existing packages keep publishing through OIDC in the same run: the setup-node step has no `registry-url`, so the publish plugin keeps each package's OIDC token in that package's own `.npmrc` and cannot reuse it for the new package. The token itself goes into the user `.npmrc` (step "Configure npm token fallback"), because `pnpm publish` ignores a `.npmrc` in a package directory. That step does nothing while the `NPM_TOKEN` secret is unset.

1. Create a granular access token on npmjs.com: scope `@daniel-rose`, read and write, bypass 2FA, expiry 7 days. Store it with `gh secret set NPM_TOKEN -R daniel-rose/monorepo`.
2. Merge the PR that adds the package. The release job publishes `1.0.0` through the token fallback of the publish plugin, with provenance. npm holds this first token publish as a staged publish: the registry shows only a placeholder version `0.0.0-stage` until you approve it with 2FA — `npm stage list @daniel-rose/<package>`, then `npm stage approve <stage-id>`. Afterwards remove the placeholder with `npm unpublish @daniel-rose/<package>@0.0.0-stage` (possible within 72 hours; otherwise `npm deprecate` it). Check that `latest` is `1.0.0`, that the tarball contents are right and that the provenance badge shows.
3. Revoke the token and run `gh secret delete NPM_TOKEN`. The workflow can stay as it is: without the secret the fallback step writes nothing.
4. Right before the next release of the package is mergeable, add the trusted publisher: `npm trust github @daniel-rose/<package> --repo daniel-rose/monorepo --file release.yml --allow-publish`. Merge within 48 hours.
5. Check `npm view @daniel-rose/<package> _npmUser`: it must be the GitHub Actions OIDC user. Then set the package to "Require 2FA and disallow tokens".

If the publish in step 2 fails after semantic-release already pushed the release commit and the tag, a rerun does nothing (the tag counts as released). Delete the tag (`git push origin :refs/tags/@daniel-rose/<package>@1.0.0`), revert the release commit in a `chore(release)` PR and merge it once the cause is fixed.

If the publish in step 4 fails because the trust expired or is wrong, recreate it with the command above and rerun the release job. As a last resort create a new 7-day token as in step 1.

From January 2027 npm ends direct token publishing. Trusted publishers are configured per package, so a new package then needs another bootstrap, e.g. a manual `npm stage publish` of the first version before the release job takes over; the publish plugin itself always runs `pnpm publish`.

## License

MIT &copy; Daniel Rose

## Links

- [GitHub](https://github.com/daniel-rose/monorepo)
