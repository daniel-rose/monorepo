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

const profileSchema = z
  .strictObject({
    name: z
      .string()
      .regex(CONFIG_PATTERN.name, CONFIG_REASON.badName)
      .refine(name => name !== ON_UNKNOWN_PROMPT, CONFIG_REASON.reservedName)
      .describe(
        'Profile name, used by `ccprofile use`, the CCPROFILE variable and `onUnknown`.'
      ),
    configDir: text(
      'CLAUDE_CONFIG_DIR of this profile; `~` is expanded. Omit it for the default profile (~/.claude). At most one profile may omit it.'
    )
      .regex(CONFIG_PATTERN.noLineControl, CONFIG_REASON.lineControl)
      .optional(),
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
  })
  .describe(
    'A profile. The first profile whose paths or remotes match wins; a profile needs at least one of them unless it is the `onUnknown` profile.'
  )

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
        'First arguments that go straight to `claude` without a profile.'
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
