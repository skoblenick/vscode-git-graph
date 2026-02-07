import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	timeout: 120_000,
	retries: process.env.CI ? 1 : 0,
	use: {
		trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry'
	}
});
