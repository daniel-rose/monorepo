import { expect, test } from '@playwright/test'

// Proves the "build once, deploy many" contract for the connection:false
// metadata pattern. NEXT_PUBLIC_FOO is NOT set when the example is built (the
// CI build step has no env) and is only provided when the standalone server
// starts (see playwright.config.ts webServer.env: NEXT_PUBLIC_FOO='bar').
//
// generateMetadata reads it via getPublicEnvByName(name, { connection: false }).
// If the value were inlined/frozen at build time, the title would be
// "foo:undefined". Reading it at request time yields the runtime value "bar".
test('generateMetadata reads the runtime env via connection:false', async ({
  page,
}) => {
  await page.goto('/metadata')

  await expect(page.locator('[data-testid="metadata-page"]')).toBeVisible()
  await expect(page).toHaveTitle('foo:bar')
})
