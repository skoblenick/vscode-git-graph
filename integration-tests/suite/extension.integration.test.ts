import * as vscode from 'vscode';

async function waitFor<T>(fn: () => T | undefined | null, timeoutMs = 15_000, intervalMs = 200): Promise<T> {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		const v = fn();
		if (v) return v;
		await new Promise(r => setTimeout(r, intervalMs));
	}
	throw new Error('Timed out waiting for condition');
}

describe('Git Graph — VS Code Integration', () => {
	test('extension is present', () => {
		const ext = vscode.extensions.getExtension('mhutchie.git-graph');
		expect(ext).toBeDefined();
	});

	test('activates successfully', async () => {
		const ext = vscode.extensions.getExtension('mhutchie.git-graph')!;
		await ext.activate();
		expect(ext.isActive).toBe(true);
	});

	test('registers expected commands', async () => {
		const ext = vscode.extensions.getExtension('mhutchie.git-graph')!;
		await ext.activate();

		const commands = await vscode.commands.getCommands(true);

		const expected = [
			'git-graph.view',
			'git-graph.addGitRepository',
			'git-graph.removeGitRepository',
			'git-graph.fetch',
			'git-graph.version',
			'git-graph.clearAvatarCache',
			'git-graph.endAllWorkspaceCodeReviews',
			'git-graph.endSpecificWorkspaceCodeReview',
			'git-graph.resumeWorkspaceCodeReview',
			'git-graph.openFile'
		];

		for (const cmd of expected) {
			expect(commands).toContain(cmd);
		}
	});

	test('opens Git Graph webview panel', async () => {
		const ext = vscode.extensions.getExtension('mhutchie.git-graph')!;
		await ext.activate();

		await vscode.commands.executeCommand('git-graph.view');

		const tab = await waitFor(() => {
			const allTabs = vscode.window.tabGroups.all.flatMap(g => g.tabs);
			return allTabs.find(t => t.label === 'Git Graph');
		}, 20_000);

		expect(tab).toBeDefined();
	});
});
