import { z } from 'zod'

export const envSchema = z.object({
  NEXT_PUBLIC_FOO: z.string(),
})

export type AppEnv = z.infer<typeof envSchema>
