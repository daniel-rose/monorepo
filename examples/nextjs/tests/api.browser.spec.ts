import { expect, test } from 'playwright/test'

test('GET /api/env returns only NEXT_PUBLIC_ variables', async ({
  request,
}) => {
  const response = await request.get('/api/env')

  expect(response.status()).toBe(200)

  const json = await response.json()

  expect(json).toHaveProperty('NEXT_PUBLIC_FOO', 'bar')
  expect(json).not.toHaveProperty('BAR')
})
