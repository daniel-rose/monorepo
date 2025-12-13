import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests',
  reporter: [['html', { outputFolder: 'tests/_report' }]],
  outputDir: 'tests/_output',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    baseURL: 'http://localhost:3000',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/*.browser.spec.ts',
    },
  ],
  webServer: [
    {
      command: 'pnpm run standalone',
      url: 'http://localhost:3000',
      timeout: 360 * 1000,
      stdout: 'pipe',
      env: {
        NEXT_PUBLIC_FOO: 'bar',
        BAR: 'foo',
      },
    },
  ],
})
