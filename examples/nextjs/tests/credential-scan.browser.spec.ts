import { expect, test } from '@playwright/test'

// Credential scanning is opt-in. The example enables it end-to-end: the layout
// uses <EnvScript scan /> (built-in engine) and the /api/env route uses the
// secretlint engine. This is the regression that legitimately-public tokens — a
// Stripe publishable key and a Google Analytics id — are NOT false-positive
// blocked by either engine: the app renders and the values reach the client
// through window.ENV and the REST route.
//
// The blocking direction (a leaked secret throws EnvexCredentialLeakError) is
// covered by the library unit tests; it cannot be exercised here without a real
// secret in the shared standalone server's root layout, which would crash every
// page render.

test('built-in engine: public tokens render via window.ENV', async ({
  page,
}) => {
  await page.goto('/')

  const envList = page.locator('[data-testid="env-list"]')
  await expect(envList).toContainText(
    'NEXT_PUBLIC_STRIPE_PK: pk_live_51AbCdEfGhIjKlMnOpQrStUvWx'
  )
  await expect(envList).toContainText('NEXT_PUBLIC_ANALYTICS_ID: G-ABCDEF1234')
})

test('secretlint engine: GET /api/env serves public tokens', async ({
  request,
}) => {
  const response = await request.get('/api/env')

  expect(response.status()).toBe(200)

  const json = await response.json()

  expect(json).toHaveProperty(
    'NEXT_PUBLIC_STRIPE_PK',
    'pk_live_51AbCdEfGhIjKlMnOpQrStUvWx'
  )
  expect(json).toHaveProperty('NEXT_PUBLIC_ANALYTICS_ID', 'G-ABCDEF1234')
})
