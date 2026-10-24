# @daniel-rose/ccprofile [2.1.0](https://github.com/daniel-rose/monorepo/compare/@daniel-rose/ccprofile@2.0.1...@daniel-rose/ccprofile@2.1.0) (2026-10-24)


### Features

* **ccprofile:** codex per profile and account ([#188](https://github.com/daniel-rose/monorepo/issues/188)) ([1918497](https://github.com/daniel-rose/monorepo/commit/1918497eea87f5ed6e42c0cf3271b59cc4775993))

## @daniel-rose/ccprofile [2.0.1](https://github.com/daniel-rose/monorepo/compare/@daniel-rose/ccprofile@2.0.0...@daniel-rose/ccprofile@2.0.1) (2026-10-24)


### Bug Fixes

* **ccprofile:** write the $schema of the installed major ([#187](https://github.com/daniel-rose/monorepo/issues/187)) ([914661a](https://github.com/daniel-rose/monorepo/commit/914661ac0a861a8c5b6b1d08b76e7fd2b3d70af5))

# @daniel-rose/ccprofile [2.0.0](https://github.com/daniel-rose/monorepo/compare/@daniel-rose/ccprofile@1.0.0...@daniel-rose/ccprofile@2.0.0) (2026-10-24)


* feat(ccprofile)!: several accounts per profile with shared config ([#185](https://github.com/daniel-rose/monorepo/issues/185)) ([012f9ba](https://github.com/daniel-rose/monorepo/commit/012f9ba4214955ae3cf1f8fe415285b7f4d5a5d9))


### BREAKING CHANGES

* the shell hook moves to v2. After upgrading, `claude`
stops with `ccprofile: hook outdated – run "ccprofile setup"` until
`ccprofile setup` reinstalls the hook. Passthrough arguments such as
`claude --version` and an explicit CLAUDE_CONFIG_DIR keep working.
Existing configs stay valid (schema major 1).

# @daniel-rose/ccprofile 1.0.0 (2026-10-23)


### Features

* **ccprofile:** add ccprofile cli ([#179](https://github.com/daniel-rose/monorepo/issues/179)) ([43a3200](https://github.com/daniel-rose/monorepo/commit/43a32003dc765b330961cfb46b278e60431bf31b))
