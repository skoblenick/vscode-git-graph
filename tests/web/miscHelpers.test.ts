/** @jest-environment jsdom */
import * as vm from 'vm';
import { createWebContext, loadWebFiles, createRepoState } from './webviewTestHelper';

describe('miscHelpers', () => {
	let ctx: vm.Context;
	let sandbox: Record<string, any>;

	beforeEach(() => {
		const webCtx = createWebContext();
		ctx = webCtx.ctx;
		sandbox = webCtx.sandbox;
		loadWebFiles(ctx, ['utils.ts', 'miscHelpers.ts']);
	});

	describe('haveFilesChanged', () => {
		it('should return true when old is null and new is not', () => {
			const result = vm.runInContext('haveFilesChanged(null, [{ additions: 1, deletions: 0, newFilePath: "a.ts", oldFilePath: "a.ts", type: "A" }])', ctx);
			expect(result).toBe(true);
		});

		it('should return true when old is not null and new is null', () => {
			const result = vm.runInContext('haveFilesChanged([{ additions: 1, deletions: 0, newFilePath: "a.ts", oldFilePath: "a.ts", type: "A" }], null)', ctx);
			expect(result).toBe(true);
		});

		it('should return false when both are null', () => {
			const result = vm.runInContext('haveFilesChanged(null, null)', ctx);
			expect(result).toBe(false);
		});

		it('should return false when files are identical', () => {
			const result = vm.runInContext(`haveFilesChanged(
				[{ additions: 1, deletions: 2, newFilePath: "a.ts", oldFilePath: "a.ts", type: "M" }],
				[{ additions: 1, deletions: 2, newFilePath: "a.ts", oldFilePath: "a.ts", type: "M" }]
			)`, ctx);
			expect(result).toBe(false);
		});

		it('should return true when files differ in type', () => {
			const result = vm.runInContext(`haveFilesChanged(
				[{ additions: 1, deletions: 0, newFilePath: "a.ts", oldFilePath: "a.ts", type: "A" }],
				[{ additions: 1, deletions: 0, newFilePath: "a.ts", oldFilePath: "a.ts", type: "M" }]
			)`, ctx);
			expect(result).toBe(true);
		});

		it('should return true when files differ in count', () => {
			const result = vm.runInContext(`haveFilesChanged(
				[{ additions: 1, deletions: 0, newFilePath: "a.ts", oldFilePath: "a.ts", type: "A" }],
				[{ additions: 1, deletions: 0, newFilePath: "a.ts", oldFilePath: "a.ts", type: "A" },
				 { additions: 2, deletions: 0, newFilePath: "b.ts", oldFilePath: "b.ts", type: "A" }]
			)`, ctx);
			expect(result).toBe(true);
		});

		it('should return true when newFilePath differs', () => {
			const result = vm.runInContext(`haveFilesChanged(
				[{ additions: 1, deletions: 0, newFilePath: "a.ts", oldFilePath: "a.ts", type: "A" }],
				[{ additions: 1, deletions: 0, newFilePath: "b.ts", oldFilePath: "a.ts", type: "A" }]
			)`, ctx);
			expect(result).toBe(true);
		});
	});

	describe('abbrevCommit', () => {
		it('should return first 8 characters', () => {
			const result = vm.runInContext('abbrevCommit("1234567890abcdef")', ctx);
			expect(result).toBe('12345678');
		});

		it('should handle exactly 8 characters', () => {
			const result = vm.runInContext('abbrevCommit("12345678")', ctx);
			expect(result).toBe('12345678');
		});

		it('should handle short hash', () => {
			const result = vm.runInContext('abbrevCommit("abc")', ctx);
			expect(result).toBe('abc');
		});
	});

	describe('getRepoDropdownOptions', () => {
		it('should return options for a single repo', () => {
			const repos = {
				'/home/user/project': createRepoState()
			};
			sandbox.initialState.config.repoDropdownOrder = 0;
			ctx.testRepos = repos;
			const result = vm.runInContext('getRepoDropdownOptions(testRepos)', ctx);
			expect(result).toEqual([
				{ name: 'project', value: '/home/user/project', hint: '' }
			]);
		});

		it('should return options for multiple repos with distinct names', () => {
			const repos = {
				'/home/user/alpha': createRepoState(),
				'/home/user/beta': createRepoState()
			};
			sandbox.initialState.config.repoDropdownOrder = 0;
			ctx.testRepos = repos;
			const result = vm.runInContext('getRepoDropdownOptions(testRepos)', ctx);
			expect(result).toHaveLength(2);
			expect(result[0].name).toBe('alpha');
			expect(result[1].name).toBe('beta');
			expect(result[0].hint).toBe('');
			expect(result[1].hint).toBe('');
		});

		it('should disambiguate repos with the same name', () => {
			const repos = {
				'/home/user/workspace1/project': createRepoState(),
				'/home/user/workspace2/project': createRepoState()
			};
			sandbox.initialState.config.repoDropdownOrder = 0;
			ctx.testRepos = repos;
			const result = vm.runInContext('getRepoDropdownOptions(testRepos)', ctx);
			expect(result).toHaveLength(2);
			expect(result[0].name).toBe('project');
			expect(result[1].name).toBe('project');
			expect(result[0].hint).not.toBe('');
			expect(result[1].hint).not.toBe('');
			expect(result[0].hint).not.toBe(result[1].hint);
		});

		it('should use repo name when set', () => {
			const repos = {
				'/home/user/project': createRepoState({ name: 'My Project' })
			};
			sandbox.initialState.config.repoDropdownOrder = 0;
			ctx.testRepos = repos;
			const result = vm.runInContext('getRepoDropdownOptions(testRepos)', ctx);
			expect(result[0].name).toBe('My Project');
		});

		it('should use the path itself for root-level paths', () => {
			const repos = {
				'C:/': createRepoState()
			};
			sandbox.initialState.config.repoDropdownOrder = 0;
			ctx.testRepos = repos;
			const result = vm.runInContext('getRepoDropdownOptions(testRepos)', ctx);
			expect(result[0].name).toBe('C:/');
		});
	});

	describe('getBranchLabels', () => {
		it('should return heads with empty remotes when combineLocalAndRemoteBranchLabels is true and no remotes match', () => {
			sandbox.initialState.config.referenceLabels.combineLocalAndRemoteBranchLabels = true;
			ctx.testHeads = ['main', 'develop'];
			ctx.testRemotes = [{ name: 'origin/feature', remote: 'origin' }];
			const result = vm.runInContext('getBranchLabels(testHeads, testRemotes)', ctx);
			expect(result.heads).toEqual([
				{ name: 'main', remotes: [] },
				{ name: 'develop', remotes: [] }
			]);
			expect(result.remotes).toEqual([{ name: 'origin/feature', remote: 'origin' }]);
		});

		it('should combine matching local and remote branches', () => {
			sandbox.initialState.config.referenceLabels.combineLocalAndRemoteBranchLabels = true;
			ctx.testHeads = ['main'];
			ctx.testRemotes = [{ name: 'origin/main', remote: 'origin' }];
			const result = vm.runInContext('getBranchLabels(testHeads, testRemotes)', ctx);
			expect(result.heads).toEqual([
				{ name: 'main', remotes: ['origin'] }
			]);
			expect(result.remotes).toEqual([]);
		});

		it('should combine multiple remotes for same branch', () => {
			sandbox.initialState.config.referenceLabels.combineLocalAndRemoteBranchLabels = true;
			ctx.testHeads = ['main'];
			ctx.testRemotes = [
				{ name: 'origin/main', remote: 'origin' },
				{ name: 'upstream/main', remote: 'upstream' }
			];
			const result = vm.runInContext('getBranchLabels(testHeads, testRemotes)', ctx);
			expect(result.heads[0].remotes).toEqual(['origin', 'upstream']);
			expect(result.remotes).toEqual([]);
		});

		it('should not combine when combineLocalAndRemoteBranchLabels is false', () => {
			sandbox.initialState.config.referenceLabels.combineLocalAndRemoteBranchLabels = false;
			ctx.testHeads = ['main'];
			ctx.testRemotes = [{ name: 'origin/main', remote: 'origin' }];
			const result = vm.runInContext('getBranchLabels(testHeads, testRemotes)', ctx);
			expect(result.heads[0].remotes).toEqual([]);
			expect(result.remotes).toEqual([{ name: 'origin/main', remote: 'origin' }]);
		});

		it('should keep remote with null remote field as remaining', () => {
			sandbox.initialState.config.referenceLabels.combineLocalAndRemoteBranchLabels = true;
			ctx.testHeads = ['main'];
			ctx.testRemotes = [{ name: 'origin/main', remote: null }];
			const result = vm.runInContext('getBranchLabels(testHeads, testRemotes)', ctx);
			expect(result.heads[0].remotes).toEqual([]);
			expect(result.remotes).toEqual([{ name: 'origin/main', remote: null }]);
		});
	});
});
