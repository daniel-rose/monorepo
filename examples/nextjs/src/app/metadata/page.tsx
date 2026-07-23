import { getPublicEnvByName } from '@daniel-rose/envex/server'
import type { Metadata } from 'next'

// Render at request time so generateMetadata runs per request (as a real
// dynamic route would). `connection: false` avoids the dynamic request API
// that throws inside a streamed-metadata / after() phase, while the env value
// is still read at request time — proving "build once, deploy many":
// NEXT_PUBLIC_FOO is NOT set at build time (see the CI build step) and only
// provided when the standalone server starts. If the value were inlined at
// build, the title would read "foo:undefined".
export const dynamic = 'force-dynamic'

export const generateMetadata = async (): Promise<Metadata> => {
  const foo = await getPublicEnvByName('NEXT_PUBLIC_FOO', { connection: false })

  return { title: `foo:${foo}` }
}

export default function MetadataPage() {
  return <div data-testid='metadata-page'>metadata route</div>
}
