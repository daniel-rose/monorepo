# ccprofile

Start [Claude Code](https://claude.com/claude-code) with the right `CLAUDE_CONFIG_DIR` depending on the current directory or git remote. One machine, several Claude subscriptions (work, private, clients), each with its own login, skills, settings, `CLAUDE.md` and MCP servers. The same profiles start the [Codex CLI](https://github.com/openai/codex) with the right `CODEX_HOME`.

> **Disclaimer:** ccprofile is an independent community project. It is not affiliated with or endorsed by Anthropic or OpenAI. "Claude" and "Claude Code" are trademarks of Anthropic, PBC, "Codex" is a trademark of OpenAI, used here only to describe compatibility.

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

`setup` installs shell functions named `claude` and `codex`. On every call they ask `ccprofile resolve` (a short Node process, nothing runs on shell startup) which profile and account apply, and then start the real `claude` (or `codex`) as a direct child with `CCPROFILE`, `CCPROFILE_ACCOUNT` and `CLAUDE_CONFIG_DIR` (or `CODEX_HOME`) set **for that child only**. Your shell environment is never changed, and the exit status of the tool is the exit status of the function.

Bypass the hook any time with `command claude` or `command codex` (zsh, bash, fish) or by calling the executable directly.

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

| Key                    | Type                            | Required / default                                                                            |
| ---------------------- | ------------------------------- | --------------------------------------------------------------------------------------------- |
| `$schema`              | string                          | optional                                                                                      |
| `onUnknown`            | `"prompt"` or a profile name    | default `"prompt"`                                                                            |
| `passthrough`          | string[]                        | default `["--version", "-v", "--help", "-h", "update"]`                                       |
| `accountThreshold`     | integer 1–100 (percent)         | default `90`, see [Choosing the account by rate limits](#choosing-the-account-by-rate-limits) |
| `profiles`             | Profile[], at least 1           | required                                                                                      |
| `profiles[].name`      | `[A-Za-z0-9_.-]+`, not `prompt` | required                                                                                      |
| `profiles[].configDir` | string                          | optional; omit it for the default profile (`~/.claude`)                                       |
| `profiles[].paths`     | string[]                        | default `[]`                                                                                  |
| `profiles[].remotes`   | string[]                        | default `[]`                                                                                  |
| `profiles[].accounts`  | `{ name, configDir, codex? }[]` | default `[]`, see [Several accounts per profile](#several-accounts-per-profile)               |
| `profiles[].codex`     | `{ home }`                      | optional; omit it for `~/.codex`, see [Codex CLI](#codex-cli)                                 |

Rules (violations stop `claude` with exit 1 and a message `<json.path>: <reason>`):

- no unknown keys, no empty or whitespace-only strings
- profile names are unique; `prompt` is reserved; `onUnknown` must be `"prompt"` or an existing name
- at most one profile without `configDir`; `configDir` is absolute after `~` expansion, has no TAB/CR/LF, is not `~/.claude` spelled out, and is unique across profiles (compared after `realpath`, case-insensitive on Windows and macOS); if it exists it must be a directory
- `paths` entries are absolute after `~` expansion; `remotes` entries need a host
- every profile needs at least one `paths` or `remotes` entry, except the `onUnknown` profile
- account names match `[A-Za-z0-9_.-]+`, are unique within their profile and differ from the profile name; an account `configDir` follows the `configDir` rules and is unique across all profiles **and** accounts
- `codex.home` (profile or account) follows the same path rules, is not `~/.codex` spelled out (omit `codex` instead) and not `~/.claude`, and is unique across every `configDir` and `codex.home`; a `configDir` must not be `~/.codex`

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

- **Choosing an account:** the first account (named after the profile) is used unless `CCPROFILE_ACCOUNT=<name>` names another account of the resolved profile (`CCPROFILE_ACCOUNT=seat-2 claude`) or, with the ccprofile mod installed, the first account is full (see [Choosing the account by rate limits](#choosing-the-account-by-rate-limits)). An unknown name, or `CCPROFILE_ACCOUNT` without any profile, stops with exit 1. Crossing profiles stays explicit (`CCPROFILE=...`).
- **Sharing the config:** `ccprofile link [profile]` links these entries of every further account to the shared source: `settings.json`, `CLAUDE.md`, `keybindings.json`, `rules/`, `skills/`, `agents/`, `commands/`, `output-styles/`, `workflows/`, `plugins/`, `themes/` and `projects/` (the history, so `claude --resume` works across the accounts). It shows the plan and asks `y/N` (`--yes` skips the question). Missing directories are created; a missing source file is skipped as `no source` rather than linked to nothing.
- **What stays per account:** the login (`.claude.json`, credentials, on macOS a keychain entry per directory) and everything Claude caches. Log in once per account: `CCPROFILE_ACCOUNT=seat-2 claude`, then `/login`.
- **MCP servers:** user-scope MCP servers live in `.claude.json` next to the login and cannot be shared by a link. Put the servers of a profile into a plugin or into `<shared source>/.mcp.json`; the hook passes that file as `--mcp-config=<file>` to every account of the profile, in addition to any `--mcp-config` you pass yourself.
- **Conflicts:** `link` never deletes or overwrites. A regular file, a directory or a link pointing elsewhere in the account dir is listed as a conflict and left alone, the other links are still created, and the exit code is 1. To resolve one, merge its content into the shared source, delete the entry in the account dir and run `link` again.
- **Checking:** `ccprofile doctor` shows the shared source, per account the login and each entry that is `missing`, `replaced by a file`, or `points elsewhere`.
- **Windows:** directories are linked as junctions, files as symlinks; without the symlink privilege (Developer Mode) a file is reported as `unsupported`. ccprofile never copies or hard-links.

Claude Code writes the user `settings.json` through a symlink, so changes made in any account (`/config`, `claude plugin install`) land in the shared file. Plugins record their install path under the account that installed them; removing that account dir can break the cache paths of plugins it installed.

## Choosing the account by rate limits

With the **ccprofile mod** installed, `claude` starts with the first account of the profile that is not full, so a second seat takes over when the first one hits its five-hour or weekly limit. The mod is a small Claude Code plugin: after every turn it writes the rate-limit windows the session saw into `<account configDir>/ccprofile/limits.json` (`~/.claude/ccprofile/limits.json` for the first account of the default profile). It writes nothing else and never sends anything anywhere.

Install it once per profile, through the shared source (the first account), so every account of the profile gets it through the shared `plugins/` and `settings.json`:

```sh
CCPROFILE=private CCPROFILE_ACCOUNT=private claude plugin marketplace add daniel-rose/monorepo
CCPROFILE=private CCPROFILE_ACCOUNT=private claude plugin install ccprofile@daniel-rose
```

Third-party marketplaces do not update on their own: enable auto-update in `/plugin` → **Marketplaces**, or run `claude plugin update ccprofile@daniel-rose` now and then. The plugin has no version number, so every change to it counts as an update.

How `resolve` chooses (only for `claude`, only for profiles with `accounts`):

- `CCPROFILE_ACCOUNT` always wins. Without it, the accounts are checked in order and the first one that is **not full** is used. An account is full when any window (`five_hour`, `seven_day`, a gateway's `spend_limit`) is at or above `accountThreshold` percent (default `90`) and has not reset yet. A window whose reset has passed counts as 0 %; a window without a reset time is ignored; an account without data counts as not full. Without any data the first account is used, as without the mod.
- Every choice other than the first account is printed: `ccprofile: profile "private" → account "seat-2" (≥90%: private five_hour 97% until 14:30)`. When every account is full, the one that is free first is used, with a warning even if that is the first account: `… (all ≥90%, free at Tue 09:00)`. Times are local; a weekday means another day.
- The choice happens only at start. A running session never switches, and a `claude` started inside a Claude Code session (`CLAUDECODE` set) does not choose by limits: it keeps the inherited `CCPROFILE_ACCOUNT`, else the first account, so it cannot jump away from the session it runs in.
- `codex` never chooses by limits: it takes the first account or `CCPROFILE_ACCOUNT`.
- The data is what **this machine** saw. Usage on claude.ai or another computer shows up only after the next session of that account here. Worst case, a session starts on an account that is already full.
- The mod cannot write to a network path: a `configDir` on a UNC share (`\\server\share\...`) gets no limit file.

`ccprofile status` names the reason after the account, `ccprofile list` shows the last reading of every account (`5h 42% · 7d 80%`, `5h reset`, `no data`) once one account of the profile has a file, and `ccprofile doctor` warns when no account of a profile has usable data (`ccprofile mod not installed?` when there is no file at all) and names broken or newer files.

## Codex CLI

The `codex` function uses the same profiles, matching and accounts as `claude`; only the directory differs. `codex.home` sets the `CODEX_HOME` of a profile (its first account and the shared Codex config) or of a further account:

```json
{
  "name": "private",
  "configDir": "~/.claude-private",
  "codex": { "home": "~/.codex-private" },
  "paths": ["~/Projects/private"],
  "accounts": [
    {
      "name": "seat-2",
      "configDir": "~/.claude-private-2",
      "codex": { "home": "~/.codex-private-2" }
    },
    { "name": "seat-3", "configDir": "~/.claude-private-3" }
  ]
}
```

- **Defaults:** a profile without `codex` starts `codex` without `CODEX_HOME`, so it uses `~/.codex`. An account without `codex` uses the Codex home of its profile and shares that login (here `seat-3`), so `CCPROFILE_ACCOUNT=seat-3 codex` works even with fewer Codex logins than Claude seats. Accounts are chosen with the same `CCPROFILE_ACCOUNT`, else the first one; `codex` never chooses by rate limits.
- **Creating homes:** Codex refuses to start when `CODEX_HOME` does not exist. `ccprofile link` creates every configured Codex home, also that of a profile without further accounts; `resolve` only prints `codex home <dir> … does not exist – run "ccprofile link"`.
- **Sharing the config:** `link` also links these entries of every account with its own `codex.home` to the Codex home of its profile (or `~/.codex`): `config.toml` (settings, MCP servers, trusted projects, features, plugins), `AGENTS.md`, `AGENTS.override.md`, `hooks.json`, `rules/`, `skills/`, `plugins/`, `themes/` and every Codex profile file `<name>.config.toml` found in the source at that time (run `link` again after adding one; `doctor` lists the missing ones). Codex writes `config.toml` through the link, so `codex mcp add` or `codex plugin add` in any account land in the shared file.
- **What stays per Codex home:** the login (`auth.json`), MCP OAuth tokens, the session history and state (`sessions/`, `history.jsonl`, sqlite files) and caches. `codex resume` therefore does not cross accounts. Log in once per Codex home: `CCPROFILE_ACCOUNT=seat-2 codex login`.
- **Passthrough:** `--version`, `-V`, `--help`, `-h`, `help`, `completion` and `update` go straight to `codex`; the list is fixed and independent of `passthrough`. `login` and `logout` are resolved, so they land in the right home.
- **Nested calls:** `codex` started from inside a Claude Code session follows the inherited `CCPROFILE` and `CCPROFILE_ACCOUNT`; a set `CLAUDE_CONFIG_DIR` does not stop it, only `CODEX_HOME` does.
- **Limits:** a Git plugin marketplace is cloned into the Codex home of the account that added it; another account may need `codex plugin marketplace upgrade`. The separation of logins relies on Codex's default file storage (`cli_auth_credentials_store = "file"`); with `"keyring"` it is not verified.
- **Checking:** `doctor` shows the login of every Codex home once (`codex ~/.codex (default)` for profiles without `codex`), `codex from profile` for accounts without `codex` in profiles that use `codex`, the Codex links, and warns when several profiles share `~/.codex` while another one has its own `codex.home`.

## Environment variables

An empty value counts as unset.

| Variable            | Effect                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE_CONFIG_DIR` | Already set: ccprofile does nothing and `claude` uses it.                                                                                                                             |
| `CODEX_HOME`        | Already set: ccprofile does nothing and `codex` uses it. Set by the hook for `codex` only.                                                                                            |
| `CCPROFILE`         | Use this profile by name (unknown name: exit 1). Nested `claude` calls inherit the parent's decision this way, because Claude Code's Bash tool also loads shell functions.            |
| `CCPROFILE_ACCOUNT` | Use this account of the resolved profile (unknown name: exit 1). Set by the hook for `claude` and `codex` (empty for the first account), so nested calls inherit it like `CCPROFILE`. |
| `CCPROFILE_CONFIG`  | Path of the config file.                                                                                                                                                              |
| `CLAUDECODE`        | Set by Claude Code in its child processes. A nested `claude` then does not choose by rate limits: the inherited `CCPROFILE_ACCOUNT`, else the first account.                          |
| `CCPROFILE_ARGV`    | Used by the PowerShell hook to hand the arguments to `ccprofile` as a JSON array. Not for manual use.                                                                                 |

Decision order of `resolve`: `CLAUDE_CONFIG_DIR` set (for `codex`: `CODEX_HOME` set), passthrough argument, no config file (no-op until you configure one), then config validation, `CCPROFILE`, matching, `onUnknown`, and last the account (`CCPROFILE_ACCOUNT`, else for `claude` the rate limits, else the first).

## Commands

| Command                                                     | Description                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ccprofile` / `ccprofile status`                            | The profile `claude` would use here and why (a match, `explicit (CCPROFILE=...)`, `no match (will prompt)`, `<name> (onUnknown)`), plus the account for profiles with accounts and why (`CCPROFILE_ACCOUNT` or the rate limits); once the config uses `codex` or `CODEX_HOME` is set, a second line `codex: <home>` (`(from profile)`, `~/.codex (default)` or `explicit (CODEX_HOME=...)`) |
| `ccprofile list`                                            | Profiles in match order with `configDir`, accounts (with their last rate-limit reading once the mod wrote one), Codex homes (once the config uses `codex`), `paths`, `remotes`, then `onUnknown`                                                                                                                                                                                            |
| `ccprofile config`                                          | Print the config path                                                                                                                                                                                                                                                                                                                                                                       |
| `ccprofile hook <shell>`                                    | Print the hook (`zsh`, `bash`, `fish`, `pwsh`, `powershell`)                                                                                                                                                                                                                                                                                                                                |
| `ccprofile link [profile] [--yes]`                          | Link the shared config of a profile (default: all) into its further accounts, for `claude` and `codex`, and create missing Codex homes; never overwrites                                                                                                                                                                                                                                    |
| `ccprofile resolve --protocol 2 [--tool codex] [--] <args>` | What the hook calls; prints `name<TAB>account<TAB>dir<TAB>mcpConfig` (account empty for the first; `dir` is the `configDir`, with `--tool codex` the `CODEX_HOME`, which never gets an `mcpConfig`) or nothing                                                                                                                                                                              |
| `ccprofile setup [shell] [--yes] [--remove]`                | Install or update the hook; `--remove` removes the block and the hook file, never your config                                                                                                                                                                                                                                                                                               |
| `ccprofile init [--example]`                                | Create the config; never overwrites. Without a terminal `--example` is required                                                                                                                                                                                                                                                                                                             |
| `ccprofile doctor`                                          | Check config, `claude` on PATH, Claude logins, rate-limit data, Codex logins, account links, hook and shell startup file; exit 1 on any `fail`                                                                                                                                                                                                                                              |

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

- The hook only affects `claude` and `codex` started from your shell. **IDE extensions, GUI launchers and anything else that starts the binary directly bypass it** and use `CLAUDE_CONFIG_DIR` or `CODEX_HOME` from their own environment.
- `doctor` warns when `CLAUDE_CONFIG_DIR`, `CODEX_HOME` or `CCPROFILE` is set in the current shell: such a shell bypasses detection.
- ccprofile never touches credentials or the contents of Claude's or Codex's files; `link` only adds symlinks and empty directories, and the mod writes only its own `ccprofile/limits.json`. Login state is read through the tools' own CLIs (`claude auth status --json`, `codex login status`); directories are only listed to suggest candidates.
- Claude Desktop, claude.ai, API keys and usage tracking are out of scope; the rate limits come only from the sessions the mod sees.

## License

MIT &copy; Daniel Rose
