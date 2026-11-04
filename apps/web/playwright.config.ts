import { defineConfig } from "@playwright/test"

const port = process.env.PLAYWRIGHT_PORT || "3000"

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: ".playwright/results",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: "list",
  use: {
    baseURL: `http://localhost:${port}`,
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
    reducedMotion: "reduce",
    colorScheme: "light",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm dev --port ${port}`,
    url: `http://localhost:${port}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
