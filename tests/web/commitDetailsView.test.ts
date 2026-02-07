/** @jest-environment jsdom */
import * as vm from 'vm';
import { createWebContext, loadWebFiles, createRepoState } from './webviewTestHelper';

function createMockView(ctx: vm.Context, overrides: Record<string, any> = {}) {
	const defaults: Record<string, any> = {
		currentRepo: '/repo',
		gitRepos: { '/repo': createRepoState() },
		commits: [
			{ hash: 'abc', message: 'first', parents: ['def'], tags: [], stash: null, date: 1000 },
			{ hash: 'def', message: 'second', parents: [], tags: [], stash: null, date: 900 }
		],
		commitLookup: { 'abc': 0, 'def': 1 },
		config: ctx.initialState.config,
		expandedCommit: null,
		gitConfig: null,
		...overrides
	};

	ctx.mockView = {
		getCurrentRepo: () => defaults.currentRepo,
		getGitRepos: () => defaults.gitRepos,
		getCommits: () => defaults.commits,
		getCommitLookup: () => defaults.commitLookup,
		getConfig: () => defaults.config,
		getExpandedCommit: () => defaults.expandedCommit,
		getGitConfig: () => defaults.gitConfig,
		isCdvDocked: () => false,
		getViewElem: () => ({ style: {}, scrollTop: 0, clientHeight: 600 }),
		getControlsElem: () => ({ clientHeight: 40 }),
		getNumColumns: () => 5,
		renderGraph: jest.fn(),
		closeCommitDetails: jest.fn(),
		saveRepoState: jest.fn(),
		saveState: jest.fn(),
		endCodeReview: jest.fn(),
		loadRepos: jest.fn(),
		getBranchOptions: jest.fn()
	};

	return defaults;
}

describe('commitDetailsView', () => {
	let ctx: vm.Context;
	let sandbox: Record<string, any>;

	beforeEach(() => {
		const webCtx = createWebContext();
		ctx = webCtx.ctx;
		sandbox = webCtx.sandbox;

		sandbox.dialog = { showError: jest.fn(), showConfirmation: jest.fn(), showForm: jest.fn(), closeActionRunning: jest.fn() };
		sandbox.contextMenu = { close: jest.fn(), show: jest.fn() };
		sandbox.runAction = jest.fn();
		sandbox.sendMessage = jest.fn();
		sandbox.eventOverlay = { create: jest.fn(), remove: jest.fn() };
		sandbox.addListenerToClass = jest.fn();
		sandbox.observeElemScroll = jest.fn();
		sandbox.insertAfter = jest.fn();
		sandbox.insertBeforeFirstChildWithClass = jest.fn();
		sandbox.TextFormatter = jest.fn().mockImplementation(() => ({ format: (s: string) => s }));
		sandbox.generateSignatureHtml = jest.fn().mockReturnValue('');
		sandbox.updateGlobalViewState = jest.fn();

		loadWebFiles(ctx, ['utils.ts', 'fileTree.ts', 'commitDetailsView.ts']);
	});

	describe('getCommitOrder', () => {
		it('should return hash1 as from when hash1 has higher commitLookup index', () => {
			createMockView(ctx, { commitLookup: { 'abc': 0, 'def': 1 } });
			const result = vm.runInContext('getCommitOrder(mockView, "def", "abc")', ctx);
			expect(result).toEqual({ from: 'def', to: 'abc' });
		});

		it('should return hash2 as from when hash2 has higher commitLookup index', () => {
			createMockView(ctx, { commitLookup: { 'abc': 0, 'def': 1 } });
			const result = vm.runInContext('getCommitOrder(mockView, "abc", "def")', ctx);
			expect(result).toEqual({ from: 'def', to: 'abc' });
		});

		it('should return consistent result when both hashes have the same index', () => {
			createMockView(ctx, { commitLookup: { 'abc': 0, 'def': 0 } });
			const result = vm.runInContext('getCommitOrder(mockView, "abc", "def")', ctx);
			expect(result).toEqual({ from: 'def', to: 'abc' });
		});
	});

	describe('getFileViewType', () => {
		it('should return config default when repo fileViewType is Default (0)', () => {
			sandbox.initialState.config.commitDetailsView.fileViewType = 1;
			createMockView(ctx, {
				gitRepos: { '/repo': createRepoState({ fileViewType: 0 }) }
			});
			const result = vm.runInContext('getFileViewType(mockView)', ctx);
			expect(result).toBe(1);
		});

		it('should return Tree (1) when repo fileViewType is Tree', () => {
			createMockView(ctx, {
				gitRepos: { '/repo': createRepoState({ fileViewType: 1 }) }
			});
			const result = vm.runInContext('getFileViewType(mockView)', ctx);
			expect(result).toBe(1);
		});

		it('should return List (2) when repo fileViewType is List', () => {
			createMockView(ctx, {
				gitRepos: { '/repo': createRepoState({ fileViewType: 2 }) }
			});
			const result = vm.runInContext('getFileViewType(mockView)', ctx);
			expect(result).toBe(2);
		});
	});

	describe('setFileViewType', () => {
		it('should set the repo fileViewType and call saveRepoState', () => {
			const viewData = createMockView(ctx);
			vm.runInContext('setFileViewType(mockView, GG.FileViewType.Tree)', ctx);
			expect(viewData.gitRepos['/repo'].fileViewType).toBe(1);
			expect(ctx.mockView.saveRepoState).toHaveBeenCalled();
		});

		it('should set fileViewType to List', () => {
			const viewData = createMockView(ctx);
			vm.runInContext('setFileViewType(mockView, GG.FileViewType.List)', ctx);
			expect(viewData.gitRepos['/repo'].fileViewType).toBe(2);
			expect(ctx.mockView.saveRepoState).toHaveBeenCalled();
		});
	});

	describe('closeCdvContextMenuIfOpen', () => {
		it('should do nothing when context menu is not open', () => {
			createMockView(ctx);
			ctx.testExpandedCommit = { contextMenuOpen: { summary: false, fileView: -1 } };
			vm.runInContext('closeCdvContextMenuIfOpen(testExpandedCommit)', ctx);
			expect(sandbox.contextMenu.close).not.toHaveBeenCalled();
		});

		it('should close context menu when summary is open', () => {
			createMockView(ctx);
			ctx.testExpandedCommit = { contextMenuOpen: { summary: true, fileView: -1 } };
			vm.runInContext('closeCdvContextMenuIfOpen(testExpandedCommit)', ctx);
			expect(sandbox.contextMenu.close).toHaveBeenCalled();
		});

		it('should close context menu when fileView > -1', () => {
			createMockView(ctx);
			ctx.testExpandedCommit = { contextMenuOpen: { summary: false, fileView: 2 } };
			vm.runInContext('closeCdvContextMenuIfOpen(testExpandedCommit)', ctx);
			expect(sandbox.contextMenu.close).toHaveBeenCalled();
		});

		it('should reset both flags after closing', () => {
			createMockView(ctx);
			ctx.testExpandedCommit = { contextMenuOpen: { summary: true, fileView: 3 } };
			vm.runInContext('closeCdvContextMenuIfOpen(testExpandedCommit)', ctx);
			expect(ctx.testExpandedCommit.contextMenuOpen.summary).toBe(false);
			expect(ctx.testExpandedCommit.contextMenuOpen.fileView).toBe(-1);
		});
	});

	describe('setCdvHeight', () => {
		it('should set element height based on repo cdvHeight', () => {
			createMockView(ctx, {
				gitRepos: { '/repo': createRepoState({ cdvHeight: 300 }) }
			});
			ctx.testElem = { style: {} };
			vm.runInContext('setCdvHeight(mockView, testElem, false)', ctx);
			expect(ctx.testElem.style.height).toBe('300px');
		});

		it('should clamp height when it exceeds window height minus 40', () => {
			Object.defineProperty(window, 'innerHeight', { value: 200, writable: true });
			const viewData = createMockView(ctx, {
				gitRepos: { '/repo': createRepoState({ cdvHeight: 500 }) }
			});
			ctx.testElem = { style: {} };
			vm.runInContext('setCdvHeight(mockView, testElem, false)', ctx);
			expect(ctx.testElem.style.height).toBe('160px');
			expect(viewData.gitRepos['/repo'].cdvHeight).toBe(160);
			expect(ctx.mockView.saveRepoState).toHaveBeenCalled();
		});
	});

	describe('setCdvDivider', () => {
		it('should set correct percentage widths on summary/divider/files elements', () => {
			createMockView(ctx, {
				gitRepos: { '/repo': createRepoState({ cdvDivider: 0.35 }) }
			});
			document.body.innerHTML = '<div id="cdvSummary"></div><div id="cdvDivider"></div><div id="cdvFiles"></div>';
			vm.runInContext('setCdvDivider(mockView)', ctx);
			const summary = document.getElementById('cdvSummary')!;
			const divider = document.getElementById('cdvDivider')!;
			const files = document.getElementById('cdvFiles')!;
			expect(parseFloat(summary.style.width)).toBeCloseTo(35.0, 1);
			expect(parseFloat(divider.style.left)).toBeCloseTo(35.0, 1);
			expect(parseFloat(files.style.left)).toBeCloseTo(35.0, 1);
		});
	});
});
