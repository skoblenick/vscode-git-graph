import * as path from 'path';
import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';

test('Git Graph webview renders core UI', async () => {
	const repoRoot = path.resolve(__dirname, '..', '..');
	const workspacePath = path.resolve(repoRoot, 'integration-tests/fixtures/workspace');

	const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');

	const electronApp = await electron.launch({
		executablePath: vscodeExecutablePath,
		args: [
			workspacePath,
			`--extensionDevelopmentPath=${repoRoot}`,
			'--disable-extensions',
			'--skip-welcome',
			'--skip-release-notes',
			'--disable-workspace-trust'
		],
		env: {
			...process.env,
			ELECTRON_DISABLE_SECURITY_WARNINGS: 'true'
		}
	});

	try {
		const page = await electronApp.firstWindow();
		await page.waitForTimeout(5_000);

		await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+P' : 'Control+Shift+P');
		await page.keyboard.type('Git Graph: View Git Graph');
		await page.keyboard.press('Enter');

		await expect(page.locator('.tabs-container')).toContainText('Git Graph', { timeout: 30_000 });
	} finally {
		await electronApp.close();
	}
});
