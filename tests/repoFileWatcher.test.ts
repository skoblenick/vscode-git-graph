import * as date from './mocks/date';
import * as vscode from './mocks/vscode';
jest.mock('vscode', () => vscode, { virtual: true });
jest.mock('../src/logger');

import { Logger } from '../src/logger';
import { RepoFileWatcher } from '../src/repoFileWatcher';

let logger: Logger;
let spyOnLog: jest.SpyInstance;

beforeAll(() => {
	logger = new Logger();
	spyOnLog = jest.spyOn(logger, 'log');
	jest.useFakeTimers();
});

afterAll(() => {
	logger.dispose();
});

function getFirstWatcher(repoFileWatcher: RepoFileWatcher) {
	return repoFileWatcher['fsWatchers'][0];
}

function getAllWatchers(repoFileWatcher: RepoFileWatcher) {
	return repoFileWatcher['fsWatchers'] as ReturnType<typeof vscode.workspace.createFileSystemWatcher>[];
}

function getOnDidCreate(repoFileWatcher: RepoFileWatcher, index = 0) {
	const watcher = getAllWatchers(repoFileWatcher)[index];
	return (<jest.Mock<any, any>>watcher.onDidCreate).mock.calls[0][0];
}

function getOnDidChange(repoFileWatcher: RepoFileWatcher, index = 0) {
	const watcher = getAllWatchers(repoFileWatcher)[index];
	return (<jest.Mock<any, any>>watcher.onDidChange).mock.calls[0][0];
}

function getOnDidDelete(repoFileWatcher: RepoFileWatcher, index = 0) {
	const watcher = getAllWatchers(repoFileWatcher)[index];
	return (<jest.Mock<any, any>>watcher.onDidDelete).mock.calls[0][0];
}

describe('RepoFileWatcher', () => {
	let repoFileWatcher: RepoFileWatcher;
	let callback: jest.Mock;
	beforeEach(() => {
		callback = jest.fn();
		repoFileWatcher = new RepoFileWatcher(logger, callback);
	});

	it('Should create multiple watchers with RelativePattern for .git paths', () => {
		repoFileWatcher.start('/path/to/repo');

		expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledTimes(5);
		expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith(
			expect.objectContaining({ base: '/path/to/repo', pattern: '.git/HEAD' })
		);
		expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith(
			expect.objectContaining({ base: '/path/to/repo', pattern: '.git/index' })
		);
		expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith(
			expect.objectContaining({ base: '/path/to/repo', pattern: '.git/refs/**' })
		);
		expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith(
			expect.objectContaining({ base: '/path/to/repo', pattern: '.git/packed-refs' })
		);
		expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith(
			expect.objectContaining({ base: '/path/to/repo', pattern: '.git/config' })
		);
	});

	it('Should receive file events and trigger callback', () => {
		repoFileWatcher.start('/path/to/repo');
		const onDidCreate = getOnDidCreate(repoFileWatcher);
		const onDidChange = getOnDidChange(repoFileWatcher);
		const onDidDelete = getOnDidDelete(repoFileWatcher);

		onDidCreate(vscode.Uri.file('/path/to/repo/.git/HEAD'));
		onDidChange(vscode.Uri.file('/path/to/repo/.git/HEAD'));
		onDidDelete(vscode.Uri.file('/path/to/repo/.git/HEAD'));
		jest.runOnlyPendingTimers();

		expect(callback).toHaveBeenCalledTimes(1);
	});

	it('Should stop a previous active File System Watcher before creating a new one', () => {
		repoFileWatcher.start('/path/to/repo1');
		const watchers = getAllWatchers(repoFileWatcher);
		const onDidCreate = getOnDidCreate(repoFileWatcher);

		onDidCreate(vscode.Uri.file('/path/to/repo1/.git/HEAD'));
		repoFileWatcher.start('/path/to/repo2');
		jest.runOnlyPendingTimers();

		for (const watcher of watchers) {
			expect(<jest.Mock<any, any>>watcher.dispose).toHaveBeenCalledTimes(1);
		}
		expect(callback).toHaveBeenCalledTimes(0);
	});

	it('Should only dispose watchers if they exist', () => {
		repoFileWatcher.stop();

		expect(spyOnLog).toHaveBeenCalledTimes(0);
	});

	it('Should dispose all watchers on stop', () => {
		repoFileWatcher.start('/path/to/repo');
		const watchers = getAllWatchers(repoFileWatcher);

		repoFileWatcher.stop();

		for (const watcher of watchers) {
			expect(<jest.Mock<any, any>>watcher.dispose).toHaveBeenCalledTimes(1);
		}
		expect(repoFileWatcher['fsWatchers']).toHaveLength(0);
	});

	it('Should ignore file system events while muted', () => {
		repoFileWatcher.start('/path/to/repo');
		const onDidCreate = getOnDidCreate(repoFileWatcher);

		repoFileWatcher.mute();
		onDidCreate(vscode.Uri.file('/path/to/repo/.git/HEAD'));
		jest.runOnlyPendingTimers();

		expect(callback).toHaveBeenCalledTimes(0);
	});

	it('Should resume reporting file events after 1.5 seconds', () => {
		date.setCurrentTime(1587559258);
		repoFileWatcher.start('/path/to/repo');
		const onDidCreate = getOnDidCreate(repoFileWatcher);
		const onDidChange = getOnDidChange(repoFileWatcher);

		repoFileWatcher.mute();
		repoFileWatcher.unmute();
		onDidCreate(vscode.Uri.file('/path/to/repo/.git/HEAD'));
		date.setCurrentTime(1587559260);
		onDidChange(vscode.Uri.file('/path/to/repo/.git/HEAD'));
		jest.runOnlyPendingTimers();

		expect(callback).toHaveBeenCalledTimes(1);
	});

	describe('Git-aware filtering', () => {
		it('Should trigger refresh for .git/HEAD', () => {
			repoFileWatcher.start('/path/to/repo');
			const onDidChange = getOnDidChange(repoFileWatcher);

			onDidChange(vscode.Uri.file('/path/to/repo/.git/HEAD'));
			jest.runOnlyPendingTimers();

			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('Should trigger refresh for .git/index', () => {
			repoFileWatcher.start('/path/to/repo');
			const onDidChange = getOnDidChange(repoFileWatcher);

			onDidChange(vscode.Uri.file('/path/to/repo/.git/index'));
			jest.runOnlyPendingTimers();

			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('Should trigger refresh for .git/refs/heads/main', () => {
			repoFileWatcher.start('/path/to/repo');
			const onDidChange = getOnDidChange(repoFileWatcher);

			onDidChange(vscode.Uri.file('/path/to/repo/.git/refs/heads/main'));
			jest.runOnlyPendingTimers();

			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('Should trigger refresh for .git/refs/stash', () => {
			repoFileWatcher.start('/path/to/repo');
			const onDidChange = getOnDidChange(repoFileWatcher);

			onDidChange(vscode.Uri.file('/path/to/repo/.git/refs/stash'));
			jest.runOnlyPendingTimers();

			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('Should trigger refresh for .git/packed-refs', () => {
			repoFileWatcher.start('/path/to/repo');
			const onDidChange = getOnDidChange(repoFileWatcher);

			onDidChange(vscode.Uri.file('/path/to/repo/.git/packed-refs'));
			jest.runOnlyPendingTimers();

			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('Should trigger refresh for .git/config', () => {
			repoFileWatcher.start('/path/to/repo');
			const onDidChange = getOnDidChange(repoFileWatcher);

			onDidChange(vscode.Uri.file('/path/to/repo/.git/config'));
			jest.runOnlyPendingTimers();

			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('Should trigger refresh for .git/FETCH_HEAD', () => {
			repoFileWatcher.start('/path/to/repo');
			const onDidChange = getOnDidChange(repoFileWatcher);

			onDidChange(vscode.Uri.file('/path/to/repo/.git/FETCH_HEAD'));
			jest.runOnlyPendingTimers();

			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('Should trigger refresh for .git/ORIG_HEAD', () => {
			repoFileWatcher.start('/path/to/repo');
			const onDidChange = getOnDidChange(repoFileWatcher);

			onDidChange(vscode.Uri.file('/path/to/repo/.git/ORIG_HEAD'));
			jest.runOnlyPendingTimers();

			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('Should NOT trigger refresh for working tree changes (src/file.ts)', () => {
			repoFileWatcher.start('/path/to/repo');
			const onDidChange = getOnDidChange(repoFileWatcher);

			onDidChange(vscode.Uri.file('/path/to/repo/src/file.ts'));
			jest.runOnlyPendingTimers();

			expect(callback).toHaveBeenCalledTimes(0);
		});

		it('Should NOT trigger refresh for .gitignore', () => {
			repoFileWatcher.start('/path/to/repo');
			const onDidChange = getOnDidChange(repoFileWatcher);

			onDidChange(vscode.Uri.file('/path/to/repo/.gitignore'));
			jest.runOnlyPendingTimers();

			expect(callback).toHaveBeenCalledTimes(0);
		});

		it('Should NOT trigger refresh for untracked .git internal files', () => {
			repoFileWatcher.start('/path/to/repo');
			const onDidChange = getOnDidChange(repoFileWatcher);

			onDidChange(vscode.Uri.file('/path/to/repo/.git/config-x'));
			jest.runOnlyPendingTimers();

			expect(callback).toHaveBeenCalledTimes(0);
		});

		it('Should NOT trigger refresh for .git/objects paths', () => {
			repoFileWatcher.start('/path/to/repo');
			const onDidChange = getOnDidChange(repoFileWatcher);

			onDidChange(vscode.Uri.file('/path/to/repo/.git/objects/ab/1234'));
			jest.runOnlyPendingTimers();

			expect(callback).toHaveBeenCalledTimes(0);
		});
	});
});
