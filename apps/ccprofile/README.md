# ccprofile

Start [Claude Code](https://claude.com/claude-code) with the right `CLAUDE_CONFIG_DIR` depending on the current directory or git remote. One machine, several Claude subscriptions (work, private, clients), each with its own login, skills, settings, `CLAUDE.md` and MCP servers.

> **Disclaimer:** ccprofile is an independent community project. It is not affiliated with or endorsed by Anthropic. "Claude" and "Claude Code" are trademarks of Anthropic, PBC, used here only to describe compatibility.

- macOS, Linux and Windows
- zsh, bash (including Git Bash on Windows), fish, PowerShell 7 and Windows PowerShell 5.1 (cmd.exe is not supported)
- Zero runtime dependencies, Node >= 24
- Never guesses silently: no match means a prompt or an explicit `onUnknown` profile
- Verified in Orca on macOS (zsh); Linux and Windows are covered by the CI shell tests

## Install

```bash
pnpm add -g @daniel-rose/ccprofile   # or npm i -g, yarn global add, bun add -g
ccprofile setup                      # installs the shell hook, then creates a config
```

`setup` detects your shell from `$SHELL` (on Windows pass it: `ccprofile setup pwsh`). It shows a diff of the changes to your shell startup file and asks `y/N` (`--yes` skips the question). Open a new terminal afterwards.

## How it works

`setup` installs a shell function named `claude`. On every call it asks `ccprofile resolve` (a short Node process, nothing runs on shell startup) which profile and account apply, and then starts the real `claude` as a direct child with `CCPROFILE`, `CCPROFILE_ACCOUNT` and `CLAUDE_CONFIG_DIR` set **for that child only**. Your shell environment is never changed, and the exit status of `claude` is the exit status of the function.

Bypass the hook any time with `command claude` (zsh, bash, fish) or by calling the executable directly.

## Configuration

Location: `$CCPROFILE_CONFIG`, else `${XDG_CONFIG_HOME:-~/.config}/ccprofile/config.json`, on Windows `%APPDATA%\ccprofile\config.json`. The file is read on every call and never written by `resolve`. Create it with `ccprofile init` (wizard) or `ccprofile init --example`.

```json
{
  "$schema": "https://unpkg.com/@daniel-rose/ccprofile@2/schema.json",
  "onUnknown": "prompt",
  "passthrough": ["--version", "-v", "--help", "-h", "update"],
  "profiles": [
    { "name": "work", "remotes": ["gitlab.example.com", "github.com/acme"] },
    {
      "name": "private",
      "configDir": "~/.claude-private",
      "remotes": ["github.com/jane"],
      "paths": ["~/Projects/private"]
    }
  ]
}
```

| Key                    | Type                            | Required / default                                                              |
| ---------------------- | ------------------------------- | ------------------------------------------------------------------------------- |
| `$schema`              | string                          | optional                                                                        |
| `onUnknown`            | `"prompt"` or a profile name    | default `"prompt"`                                                              |
| `passthrough`          | string[]                        | default `["--version", "-v", "--help", "-h", "update"]`                         |
| `profiles`             | Profile[], at least 1           | required                                                                        |
| `profiles[].name`      | `[A-Za-z0-9_.-]+`, not `prompt` | required                                                                        |
| `profiles[].configDir` | string                          | optional; omit it for the default profile (`~/.claude`)                         |
| `profiles[].paths`     | string[]                        | default `[]`                                                                    |
| `profiles[].remotes`   | string[]                        | default `[]`                                                                    |
| `profiles[].accounts`  | `{ name, configDir }[]`         | default `[]`, see [Several accounts per profile](#several-accounts-per-profile) |

Rules (violations stop `claude` with exit 1 and a message `<json.path>: <reason>`):

- no unknown keys, no empty or whitespace-only strings
- profile names are unique; `prompt` is reserved; `onUnknown` must be `"prompt"` or an existing name
- at most one profile without `configDir`; `configDir` is absolute after `~` expansion, has no TAB/CR/LF, is not `~/.claude` spelled out, and is unique across profiles (compared after `realpath`, case-insensitive on Windows and macOS); if it exists it must be a directory
- `paths` entries are absolute after `~` expansion; `remotes` entries need a host
- every profile needs at least one `paths` or `remotes` entry, except the `onUnknown` profile
- account names match `[A-Za-z0-9_.-]+`, are unique within their profile and differ from the profile name; an account `configDir` follows the `configDir` rules and is unique across all profiles **and** accounts

A `configDir` that does not exist yet is fine: ccprofile prints `creating new profile "<name>" at <dir>, first start will ask for login` and starts `claude`, which asks for the login.

## Matching

Profiles are checked in array order, the first match wins. Within a profile, `paths` and `remotes` are alternatives.

**Paths** are compared physically: the current directory and each entry are resolved with `realpath` before a segment-boundary prefix check (`/work/app` matches `/work/app/src`, not `/work/app2`). Comparison is case-insensitive on Windows and macOS. Entries that do not exist are skipped. On Git Bash use the Windows form in the config (`C:\Projects\work`), because the config is read by Node, not by the shell.

**Remotes** come from `git remote get-url origin`, so git's `url.<base>.insteadOf` rewrites apply. No git, no repository or no `origin` means no remote. Both sides are normalized to `host/path`: scheme, user info, port, a trailing `.git` and a trailing `/` are removed, and the scp form `user@host:path` is understood. Remotes without a host (local paths, `file://`, `C:\...`, `\\server\...`) never match. Comparison is case-insensitive with a segment-boundary prefix, so `github.com/acme` matches `github.com/acme/app` and `gitlab.example.com` matches everything on that host.

- **Ports are stripped on purpose**, so the SSH and HTTPS URL of one server match the same entry.
- **SSH host aliases match literally.** If `~/.ssh/config` defines `Host github-work`, list `github-work/acme` (or add an `insteadOf` rule).
- **Azure DevOps and Gerrit** use different hosts or paths for SSH and HTTPS; list both forms.
- **Submodules:** a `paths` entry of the parent project wins over the submodule's own remote when the parent profile is listed first. Order the profiles accordingly.

### What happens when nothing matches

- `onUnknown` is a profile name: that profile is used and `ccprofile: no match, using "<name>" (onUnknown)` goes to stderr.
- `onUnknown` is `"prompt"` and stdin is a terminal: you pick a profile from a list (empty input, EOF or Ctrl-C aborts without starting `claude`).
- `onUnknown` is `"prompt"` and stdin is not a terminal: exit 1 with a message that names `onUnknown` and `CCPROFILE=<name> claude`.

### Arguments that skip profile selection

`passthrough` lists arguments that go straight to `claude` without a profile, so `claude --version` works even with a broken config. Entries starting with `-` match any argument before a literal `--`; other entries (`update`) match only the first argument. A list in the config replaces the default.

## Several accounts per profile

A profile is a cost center: its matchers, one shared config (settings, plugins, skills, MCP, history) and one or more logins. The profile's `configDir` (or `~/.claude` for the default profile) is the **first account** and the **shared source**; `accounts` adds further logins in order:

```json
{
  "name": "client-a",
  "configDir": "~/.claude-client-a",
  "remotes": ["gitlab.client-a.example"],
  "accounts": [{ "name": "seat-2", "configDir": "~/.claude-client-a-2" }]
}
```

- **Choosing an account:** the first account (named after the profile) is used unless `CCPROFILE_ACCOUNT=<name>` names another account of the resolved profile (`CCPROFILE_ACCOUNT=seat-2 claude`). An unknown name, or `CCPROFILE_ACCOUNT` without any profile, stops with exit 1. There is no automatic switching; crossing profiles stays explicit (`CCPROFILE=...`).
- **Sharing the config:** `ccprofile link [profile]` links these entries of every further account to the shared source: `settings.json`, `CLAUDE.md`, `keybindings.json`, `rules/`, `skills/`, `agents/`, `commands/`, `output-styles/`, `workflows/`, `plugins/`, `themes/` and `projects/` (the history, so `claude --resume` works across the accounts). It shows the plan and asks `y/N` (`--yes` skips the question). Missing directories are created; a missing source file is skipped as `no source` rather than linked to nothing.
- **What stays per account:** the login (`.claude.json`, credentials, on macOS a keychain entry per directory) and everything Claude caches. Log in once per account: `CCPROFILE_ACCOUNT=seat-2 claude`, then `/login`.
- **MCP servers:** user-scope MCP servers live in `.claude.json` next to the login and cannot be shared by a link. Put the servers of a profile into a plugin or into `<shared source>/.mcp.json`; the hook passes that file as `--mcp-config=<file>` to every account of the profile, in addition to any `--mcp-config` you pass yourself.
- **Conflicts:** `link` never deletes or overwrites. A regular file, a directory or a link pointing elsewhere in the account dir is listed as a conflict and left alone, the other links are still created, and the exit code is 1. To resolve one, merge its content into the shared source, delete the entry in the account dir and run `link` again.
- **Checking:** `ccprofile doctor` shows the shared source, per account the login and each entry that is `missing`, `replaced by a file`, or `points elsewhere`.
- **Windows:** directories are linked as junctions, files as symlinks; without the symlink privilege (Developer Mode) a file is reported as `unsupported`. ccprofile never copies or hard-links.

Claude Code writes the user `settings.json` through a symlink, so changes made in any account (`/config`, `claude plugin install`) land in the shared file. Plugins record their install path under the account that installed them; removing that account dir can break the cache paths of plugins it installed.

## Environment variables

An empty value counts as unset.

| Variable            | Effect                                                                                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE_CONFIG_DIR` | Already set: ccprofile does nothing and `claude` uses it.                                                                                                                  |
| `CCPROFILE`         | Use this profile by name (unknown name: exit 1). Nested `claude` calls inherit the parent's decision this way, because Claude Code's Bash tool also loads shell functions. |
| `CCPROFILE_ACCOUNT` | Use this account of the resolved profile (unknown name: exit 1). Set by the hook for `claude` (empty for the first account), so nested calls inherit it like `CCPROFILE`.  |
| `CCPROFILE_CONFIG`  | Path of the config file.                                                                                                                                                   |
| `CCPROFILE_ARGV`    | Used by the PowerShell hook to hand the arguments to `ccprofile` as a JSON array. Not for manual use.                                                                      |

Decision order of `resolve`: `CLAUDE_CONFIG_DIR` set, passthrough argument, no config file (no-op until you configure one), then config validation, `CCPROFILE`, matching, `onUnknown`, and last the account (`CCPROFILE_ACCOUNT`, else the first).

## Commands

| Command                                      | Description                                                                                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ccprofile` / `ccprofile status`             | The profile `claude` would use here and why (a match, `explicit (CCPROFILE=...)`, `no match (will prompt)`, `<name> (onUnknown)`), plus the account for profiles with accounts |
| `ccprofile list`                             | Profiles in match order with `configDir`, accounts, `paths`, `remotes`, then `onUnknown`                                                                                       |
| `ccprofile config`                           | Print the config path                                                                                                                                                          |
| `ccprofile hook <shell>`                     | Print the hook (`zsh`, `bash`, `fish`, `pwsh`, `powershell`)                                                                                                                   |
| `ccprofile link [profile] [--yes]`           | Link the shared config of a profile (default: all) into its further accounts; never overwrites                                                                                 |
| `ccprofile resolve --protocol 2 [--] <args>` | What the hook calls; prints `name<TAB>account<TAB>configDir<TAB>mcpConfig` (account empty for the first) or nothing                                                            |
| `ccprofile setup [shell] [--yes] [--remove]` | Install or update the hook; `--remove` removes the block and the hook file, never your config                                                                                  |
| `ccprofile init [--example]`                 | Create the config; never overwrites. Without a terminal `--example` is required                                                                                                |
| `ccprofile doctor`                           | Check config, `claude` on PATH, logins, account links, hook and shell startup file; exit 1 on any `fail`                                                                       |

`init` in a terminal is a wizard: it finds `~/.claude` and every `~/.claude-*` directory with a `.claude.json`, shows the login state from `claude auth status --json`, and asks for a name and at least one remote or path prefix per profile.

### What `setup` changes

| Shell            | Hook file                           | Startup file                                                                |
| ---------------- | ----------------------------------- | --------------------------------------------------------------------------- |
| zsh              | `<config home>/ccprofile/hook.zsh`  | `${ZDOTDIR:-~}/.zshrc`                                                      |
| bash             | `<config home>/ccprofile/hook.bash` | `~/.bashrc`                                                                 |
| fish             | `<config home>/ccprofile/hook.fish` | `~/.config/fish/conf.d/ccprofile.fish` (the file itself is the integration) |
| pwsh, powershell | `<config home>/ccprofile/hook.ps1`  | `$PROFILE.CurrentUserAllHosts` of that executable                           |

The startup file gets one block between `# >>> ccprofile >>>` and `# <<< ccprofile <<<` that sources the hook. Running `setup` again replaces the block and rewrites the hook file, which is also how you update the hook after upgrading the package. An outdated hook stops with `ccprofile: hook outdated – run "ccprofile setup"` instead of starting `claude` with the wrong profile (`--version` and other passthrough arguments keep working). Symlinked startup files are written through, line endings and a BOM are kept, and a file with duplicate or unmatched markers is left untouched.

Bash on macOS and Windows starts as a login shell and reads `~/.bash_profile`, not `~/.bashrc`; `setup` and `doctor` warn if `~/.bash_profile` does not source `~/.bashrc`.

## Windows notes

- The PowerShell hook passes the arguments through `CCPROFILE_ARGV` instead of the command line, because the `.ps1` shim that npm and pnpm create loses a `--`, and the `.cmd` shim drops empty arguments.
- Known limit: PowerShell's own argument binder consumes a literal `--` that you type (`claude -- x`) before the hook sees it. PowerShell 7.0 to 7.2 drop empty-string arguments (unsupported versions, use 7.3 or newer).
- `setup` refuses startup files that are not UTF-8 (for example a UTF-16 PowerShell profile created by older tools): convert the file to UTF-8 first. It writes a UTF-8 BOM into PowerShell profiles when needed for Windows PowerShell 5.1.
- Git Bash behaves like bash; the paths in the config use the Windows form.

## Limitations

- The hook only affects `claude` started from your shell. **IDE extensions, GUI launchers and anything else that starts the `claude` binary directly bypass it** and use `CLAUDE_CONFIG_DIR` from their own environment.
- `doctor` warns when `CLAUDE_CONFIG_DIR` or `CCPROFILE` is set in the current shell: such a shell bypasses detection.
- ccprofile never touches credentials or the contents of Claude's files; `link` only adds symlinks and empty directories. Login state is read through Claude's own CLI (`claude auth status --json`); directories are only listed to suggest candidates.
- Claude Desktop, claude.ai, API keys and usage tracking are out of scope.

## License

MIT &copy; Daniel Rose
