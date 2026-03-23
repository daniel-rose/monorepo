import { EnvexProvider } from '@daniel-rose/envex'
import { InlineEnvScript } from '@daniel-rose/envex/script'
import { getPublicEnv } from '@daniel-rose/envex/server'
import type { ReactNode } from 'react'

export default async function InlineLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const initialEnv = await getPublicEnv()

  return (
    <>
      <InlineEnvScript />
      <EnvexProvider initialEnv={initialEnv}>{children}</EnvexProvider>
    </>
  )
}
