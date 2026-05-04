import { expect, test } from 'playwright/test'

test('GET /api/env-schema returns schema-validated public env', async ({
  request,
}) => {
  const response = await request.get('/api/env-schema')

  expect(response.status()).toBe(200)

  const json = await response.json()

  expect(json).toHaveProperty('NEXT_PUBLIC_FOO', 'bar')
  expect(json).not.toHaveProperty('BAR')
})

test('Schema page renders Zod-validated env var', async ({ page }) => {
  await page.goto('/schema')

  const schemaEnv = page.locator('[data-testid="schema-env"]')
  await expect(schemaEnv).toContainText('NEXT_PUBLIC_FOO: bar')
})
