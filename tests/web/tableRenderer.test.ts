/** @jest-environment jsdom */
import * as vm from 'vm';
import { createWebContext, loadWebFiles, createRepoState } from './webviewTestHelper';

function createMockView(ctx: vm.Context, overrides: Record<string, any> = {}) {
	const defaults: Record<string, any> = {
		currentRepo: '/repo',
		gitRepos: { '/repo': createRepoState() },
		config: ctx.initialState.config,
		...overrides
	};

	ctx.mockView = {
		getCurrentRepo: () => defaults.currentRepo,
		getGitRepos: () => defaults.gitRepos,
		getConfig: () => defaults.config,
	};

	return defaults;
}

describe('tableRenderer', () => {
	let ctx: vm.Context;
	let sandbox: Record<string, any>;

	beforeEach(() => {
		const webCtx = createWebContext();
		ctx = webCtx.ctx;
		sandbox = webCtx.sandbox;
		loadWebFiles(ctx, ['utils.ts', 'repoStateHelpers.ts', 'tableRenderer.ts']);
	});

	describe('getColumnVisibility', () => {
		it('should use default column visibility when columnWidths is null', () => {
			sandbox.initialState.config.defaultColumnVisibility = { date: true, author: true, commit: true };
			createMockView(ctx);
			const result = vm.runInContext('getColumnVisibility(mockView)', ctx);
			expect(result).toEqual({ date: true, author: true, commit: true });
		});

		it('should use default with some hidden', () => {
			sandbox.initialState.config.defaultColumnVisibility = { date: true, author: false, commit: true };
			createMockView(ctx);
			const result = vm.runInContext('getColumnVisibility(mockView)', ctx);
			expect(result).toEqual({ date: true, author: false, commit: true });
		});

		it('should detect hidden columns from columnWidths', () => {
			const COLUMN_HIDDEN = -100;
			createMockView(ctx, {
				gitRepos: {
					'/repo': createRepoState({ columnWidths: [200, COLUMN_HIDDEN, 150, 80] })
				}
			});
			const result = vm.runInContext('getColumnVisibility(mockView)', ctx);
			expect(result).toEqual({ date: false, author: true, commit: true });
		});

		it('should detect all visible columns from columnWidths', () => {
			createMockView(ctx, {
				gitRepos: {
					'/repo': createRepoState({ columnWidths: [200, 150, 120, 80] })
				}
			});
			const result = vm.runInContext('getColumnVisibility(mockView)', ctx);
			expect(result).toEqual({ date: true, author: true, commit: true });
		});

		it('should detect all hidden columns from columnWidths', () => {
			const COLUMN_HIDDEN = -100;
			createMockView(ctx, {
				gitRepos: {
					'/repo': createRepoState({ columnWidths: [200, COLUMN_HIDDEN, COLUMN_HIDDEN, COLUMN_HIDDEN] })
				}
			});
			const result = vm.runInContext('getColumnVisibility(mockView)', ctx);
			expect(result).toEqual({ date: false, author: false, commit: false });
		});
	});

	describe('getNumColumns', () => {
		it('should return 5 when all columns visible', () => {
			sandbox.initialState.config.defaultColumnVisibility = { date: true, author: true, commit: true };
			createMockView(ctx);
			const result = vm.runInContext('getNumColumns(mockView)', ctx);
			expect(result).toBe(5);
		});

		it('should return 4 when one column hidden', () => {
			sandbox.initialState.config.defaultColumnVisibility = { date: true, author: false, commit: true };
			createMockView(ctx);
			const result = vm.runInContext('getNumColumns(mockView)', ctx);
			expect(result).toBe(4);
		});

		it('should return 3 when two columns hidden', () => {
			sandbox.initialState.config.defaultColumnVisibility = { date: false, author: false, commit: true };
			createMockView(ctx);
			const result = vm.runInContext('getNumColumns(mockView)', ctx);
			expect(result).toBe(3);
		});

		it('should return 2 when all optional columns hidden', () => {
			sandbox.initialState.config.defaultColumnVisibility = { date: false, author: false, commit: false };
			createMockView(ctx);
			const result = vm.runInContext('getNumColumns(mockView)', ctx);
			expect(result).toBe(2);
		});
	});
});
