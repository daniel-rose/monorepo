import { z } from 'zod'

import {
  CONFIG_PATTERN,
  CONFIG_REASON,
  DEFAULT_PASSTHROUGH,
  ON_UNKNOWN_PROMPT,
} from '../../constants'

const text = (description: string) =>
  z
    .string()
    .regex(CONFIG_PATTERN.nonBlank, CONFIG_REASON.empty)
    .describe(description)

const configDirText = (description: string) =>
  text(description).regex(
    CONFIG_PATTERN.noLineControl,
    CONFIG_REASON.lineControl
  )

const codexSchema = (description: string) =>
  z
    .strictObject({
      home: configDirText(
        'CODEX_HOME (`~` is expanded); must not be ~/.codex, the default. `ccprofile link` creates it.'
      ),
    })
    .describe(description)

const accountSchema = z
  .strictObject({
    name: z
      .string()
      .regex(CONFIG_PATTERN.name, CONFIG_REASON.badName)
      .describe(
        'Account name: unique within the profile and different from the profile name; selects this account through the CCPROFILE_ACCOUNT variable.'
      ),
    configDir: configDirText(
      'CLAUDE_CONFIG_DIR of this account (its own login); `~` is expanded. `ccprofile link` links the shared config of the profile into it.'
    ),
    codex: codexSchema(
      'Codex CLI login of this account. `ccprofile link` links the Codex config of the profile into it. Omit it to use the Codex home of the profile.'
    ).optional(),
  })
  .describe(
    'A further login of the profile. It shares the config of the profile configDir.'
  )

const profileSchema = z
  .strictObject({
    name: z
      .string()
      .regex(CONFIG_PATTERN.name, CONFIG_REASON.badName)
      .refine(name => name !== ON_UNKNOWN_PROMPT, CONFIG_REASON.reservedName)
      .describe(
        'Profile name: shown by `ccprofile status` and `ccprofile list`, selects this profile through the CCPROFILE variable (`CCPROFILE=<name> claude`) and through `onUnknown`.'
      ),
    configDir: configDirText(
      'CLAUDE_CONFIG_DIR of this profile; `~` is expanded. Omit it for the default profile (~/.claude). At most one profile may omit it. It is the first account and the shared config of all accounts.'
    ).optional(),
    codex: codexSchema(
      'Codex CLI of this profile: the first Codex account and the shared Codex config of all accounts. Omit it to use ~/.codex.'
    ).optional(),
    paths: z
      .array(
        text('Directory (`~` expanded) whose subtree selects this profile.')
      )
      .default([])
      .describe('Directories that select this profile.'),
    remotes: z
      .array(
        text(
          'Git remote prefix such as `github.com/acme` or `gitlab.example.com`; URL forms are normalized.'
        )
      )
      .default([])
      .describe('Git remotes of `origin` that select this profile.'),
    accounts: z
      .array(accountSchema)
      .default([])
      .describe(
        'Further accounts in order, after the profile itself (the first account).'
      ),
  })
  .describe(
    'A profile. The first profile whose paths or remotes match wins; a profile needs at least one of them unless it is the `onUnknown` profile.'
  )

type ParsedProfile = z.output<typeof profileSchema>

// Account names are unique within their profile and differ from its name
// (the first account carries the profile name).
const checkAccounts = (
  profile: ParsedProfile,
  index: number,
  ctx: z.RefinementCtx
): void => {
  const seen = new Set<string>()
  profile.accounts.forEach(({ name }, entry) => {
    const path = ['profiles', index, 'accounts', entry, 'name']
    if (name === profile.name) {
      ctx.addIssue({
        code: 'custom',
        path,
        message: CONFIG_REASON.accountIsProfile,
      })
    } else if (seen.has(name)) {
      ctx.addIssue({
        code: 'custom',
        path,
        message: `duplicate account name "${name}"`,
      })
    }
    seen.add(name)
  })
}

// Cross-field rules that need no filesystem and no platform. Path rules
// (absolute, duplicates, ~/.claude, directory checks) live in resolveConfig.
const configSchema = z
  .strictObject({
    $schema: z
      .string()
      .optional()
      .describe('JSON Schema URL for editor hints.'),
    onUnknown: text(
      'What to do in an unmatched directory: "prompt" asks, a profile name uses that profile.'
    ).default(ON_UNKNOWN_PROMPT),
    passthrough: z
      .array(text('Argument that skips profile selection.'))
      .default([...DEFAULT_PASSTHROUGH])
      .describe(
        'Arguments that start `claude` without a profile. Entries starting with `-` match any argument before a literal `--`; other entries match only the first argument. Replaces the default list.'
      ),
    profiles: z
      .array(profileSchema)
      .min(1, CONFIG_REASON.noProfiles)
      .describe('Profiles in priority order.'),
  })
  .describe('ccprofile configuration.')
  .superRefine((config, ctx) => {
    const firstIndexByName = new Map<string, number>()
    let defaultProfiles = 0

    config.profiles.forEach((profile, index) => {
      if (firstIndexByName.has(profile.name)) {
        ctx.addIssue({
          code: 'custom',
          path: ['profiles', index, 'name'],
          message: `duplicate name "${profile.name}"`,
        })
      } else {
        firstIndexByName.set(profile.name, index)
      }

      if (profile.configDir === undefined) {
        defaultProfiles += 1
        if (defaultProfiles > 1) {
          ctx.addIssue({
            code: 'custom',
            path: ['profiles', index, 'configDir'],
            message: CONFIG_REASON.multipleDefaults,
          })
        }
      }

      checkAccounts(profile, index, ctx)

      if (
        profile.paths.length === 0 &&
        profile.remotes.length === 0 &&
        profile.name !== config.onUnknown
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['profiles', index],
          message: CONFIG_REASON.noMatchers,
        })
      }
    })

    if (
      config.onUnknown !== ON_UNKNOWN_PROMPT &&
      !firstIndexByName.has(config.onUnknown)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['onUnknown'],
        message: CONFIG_REASON.badOnUnknown,
      })
    }
  })

export default configSchema
