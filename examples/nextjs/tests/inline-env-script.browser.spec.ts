import { expect, test } from 'playwright/test'

test('InlineEnvScript injects NEXT_PUBLIC_ variables into window.ENV', async ({
  page,
}) => {
  await page.goto('/inline')

  const envList = page.locator('[data-testid="env-list"]')
  await expect(envList).toContainText('NEXT_PUBLIC_FOO: bar')
  await expect(envList).not.toContainText('BAR: foo')
})
