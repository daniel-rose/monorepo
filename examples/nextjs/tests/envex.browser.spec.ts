import { expect, test } from 'playwright/test'

test('Try to get dynamic env variable with prefix "NEXT_PUBLIC_"', async ({
  page,
}) => {
  await page.goto('/')

  const serverEnv = page.locator('[data-testid="server-env"]')
  await expect(serverEnv).toContainText('BAR: foo')

  const envList = page.locator('[data-testid="env-list"]')
  await expect(envList).toContainText('NEXT_PUBLIC_FOO: bar')
  await expect(envList).not.toContainText('BAR: foo')
})
