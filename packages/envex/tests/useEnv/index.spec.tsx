import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { EnvexProvider, EnvexProviderIsMissingError } from '../../src'
import EnvList from '../../src/EnvList'

test('Try to render a component which uses "useEnv" without EnvexProvider as parent.', async () => {
  try {
    await render(<EnvList />)
  } catch (error) {
    expect(error).toBeInstanceOf(EnvexProviderIsMissingError)
  }
})

test('Try to render a component which uses "useEnv" without EnvexProvider as parent.', async () => {
  window.ENV = {
    NEXT_PUBLIC_TEST: 'test',
  }

  try {
    await render(
      <EnvexProvider initialEnv={{}}>
        <EnvList />
      </EnvexProvider>
    )
  } catch (error) {
    expect(error).toBeInstanceOf(EnvexProviderIsMissingError)
  }

  delete window.ENV
})
