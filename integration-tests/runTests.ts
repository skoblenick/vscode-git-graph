import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
	const repoRoot = path.resolve(__dirname, '..', '..');
	const extensionTestsPath = path.resolve(repoRoot, 'out/integration-tests/suite/index');
	const workspacePath = path.resolve(repoRoot, 'integration-tests/fixtures/workspace');

	await runTests({
		extensionDevelopmentPath: repoRoot,
		extensionTestsPath,
		launchArgs: [
			workspacePath,
			'--disable-extensions',
			'--skip-welcome',
			'--skip-release-notes',
			'--disable-workspace-trust'
		]
	});
}

main().catch(err => {
	console.error('Failed to run integration tests:', err);
	process.exit(1);
});
