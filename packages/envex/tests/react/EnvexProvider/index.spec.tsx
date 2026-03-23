import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import {
  EnvexProvider,
  EnvexScriptIsMissingError,
  EnvexWindowEnvIsMissingError,
} from '../../../src'

test('Try to render "EnvProvider" without required window variable "ENV".', async () => {
  try {
    await render(<EnvexProvider initialEnv={{}}>Children</EnvexProvider>)
  } catch (error) {
    expect(error).toBeInstanceOf(EnvexWindowEnvIsMissingError)
    expect(error).toBeInstanceOf(EnvexScriptIsMissingError)
  }
})

test('Try to render "EnvProvider" with required window variable "ENV".', async () => {
  window.ENV = {
    NEXT_PUBLIC_TEST: 'test',
  }

  const { getByText } = await render(
    <EnvexProvider initialEnv={{}}>Children</EnvexProvider>
  )

  await expect.element(getByText('Children')).toBeInTheDocument()

  delete window.ENV
})

test('Try to render "EnvProvider" without initialEnv (PHP scenario).', async () => {
  window.ENV = {
    MY_CUSTOM_VAR: 'php-value',
  }

  const { getByText } = await render(<EnvexProvider>Children</EnvexProvider>)

  await expect.element(getByText('Children')).toBeInTheDocument()

  delete window.ENV
})

test('Try to render "EnvProvider" with endpoint prop.', async () => {
  const mockEnv = { API_URL: 'https://api.example.com' }

  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    json: () => Promise.resolve(mockEnv),
  } as Response)

  const { getByText } = await render(
    <EnvexProvider endpoint='/api/env'>Children</EnvexProvider>
  )

  await expect.element(getByText('Children')).toBeInTheDocument()

  vi.restoreAllMocks()
})

test('Try to render "EnvProvider" with endpoint ignores window.ENV.', async () => {
  window.ENV = { NEXT_PUBLIC_TEST: 'test' }

  const mockEnv = { API_URL: 'https://api.example.com' }

  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    json: () => Promise.resolve(mockEnv),
  } as Response)

  const { getByText } = await render(
    <EnvexProvider endpoint='/api/env'>Children</EnvexProvider>
  )

  await expect.element(getByText('Children')).toBeInTheDocument()

  delete window.ENV
  vi.restoreAllMocks()
})
