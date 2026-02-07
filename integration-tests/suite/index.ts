import * as path from 'path';
import { execFileSync } from 'child_process';

export async function run(): Promise<void> {
	const repoRoot = path.resolve(__dirname, '..', '..');
	const configPath = path.resolve(repoRoot, 'integration-tests', 'jest.config.js');

	execFileSync(process.execPath, [
		path.resolve(repoRoot, 'node_modules', 'jest-cli', 'bin', 'jest.js'),
		'--config', configPath,
		'--verbose',
		'--no-cache'
	], {
		cwd: repoRoot,
		stdio: 'inherit',
		env: { ...process.env }
	});
}
