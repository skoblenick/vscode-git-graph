/** @jest-environment jsdom */
import * as vm from 'vm';
import { createRepoState, createWebContext, loadWebFiles } from './webviewTestHelper';

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

describe('renderCommitDetailsView', () => {
	let ctx: vm.Context;
	let sandbox: Record<string, any>;

	beforeEach(() => {
		document.body.innerHTML = '';
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
		sandbox.insertAfter = jest.fn().mockImplementation((newNode: HTMLElement, refNode: HTMLElement) => {
			if (refNode.parentNode) refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
		});
		sandbox.insertBeforeFirstChildWithClass = jest.fn();
		sandbox.TextFormatter = jest.fn().mockImplementation(() => ({ format: (s: string) => s }));
		sandbox.generateSignatureHtml = jest.fn().mockReturnValue('');
		sandbox.updateGlobalViewState = jest.fn();

		loadWebFiles(ctx, ['utils.ts', 'repoStateHelpers.ts', 'miscHelpers.ts', 'textFormatter.ts', 'fileTree.ts', 'commitDetailsView.ts']);
		vm.runInContext('observeElemScroll = function() {}', ctx);
	});

	afterEach(() => {
		document.body.innerHTML = '';
	});

	function createCdvMockView(overrides: Record<string, any> = {}) {
		const viewElem = document.createElement('div');
		viewElem.id = 'view';
		Object.defineProperty(viewElem, 'clientHeight', { value: 600, configurable: true });
		viewElem.scrollTop = 0;
		viewElem.scroll = jest.fn();
		document.body.appendChild(viewElem);

		const controlsElem = document.createElement('div');
		controlsElem.id = 'controls';
		Object.defineProperty(controlsElem, 'clientHeight', { value: 40, configurable: true });
		document.body.appendChild(controlsElem);

		const defaults: Record<string, any> = {
			currentRepo: '/repo',
			gitRepos: { '/repo': createRepoState() },
			commits: [
				{ hash: 'abc123', message: 'first', parents: ['def456'], author: 'Author', email: 'a@b.com', date: 1000, tags: [], stash: null, heads: [], remotes: [] },
				{ hash: 'def456', message: 'second', parents: [], author: 'Author', email: 'a@b.com', date: 900, tags: [], stash: null, heads: [], remotes: [] }
			],
			commitLookup: { 'abc123': 0, 'def456': 1 },
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
			getViewElem: () => viewElem,
			getControlsElem: () => controlsElem,
			getNumColumns: () => 5,
			renderGraph: jest.fn(),
			closeCommitDetails: jest.fn(),
			saveRepoState: jest.fn(),
			saveState: jest.fn(),
			endCodeReview: jest.fn(),
			loadRepos: jest.fn(),
			getBranchOptions: jest.fn()
		};

		return { defaults, viewElem, controlsElem };
	}

	it('should return early when expandedCommit is null', () => {
		createCdvMockView({ expandedCommit: null });

		vm.runInContext('renderCommitDetailsView(mockView, false)', ctx);

		const cdv = document.getElementById('cdv');
		expect(cdv).toBeNull();
	});

	it('should return early when commitElem is null', () => {
		createCdvMockView({
			expandedCommit: {
				commitHash: 'abc123', compareWithHash: null, commitElem: null,
				loading: true, commitDetails: null, fileTree: null, fileChanges: null,
				avatar: null, codeReview: null, lastViewedFile: null,
				contextMenuOpen: { summary: false, fileView: -1 },
				scrollTop: { summary: 0, fileView: 0 }, compareWithElem: null, index: 0
			}
		});

		vm.runInContext('renderCommitDetailsView(mockView, false)', ctx);

		const cdv = document.getElementById('cdv');
		expect(cdv).toBeNull();
	});

	it('should create CDV element with loading state when loading is true', () => {
		const commitElem = document.createElement('tr');
		commitElem.dataset.id = '0';
		document.body.appendChild(commitElem);

		createCdvMockView({
			expandedCommit: {
				commitHash: 'abc123', compareWithHash: null, commitElem: commitElem,
				loading: true, commitDetails: null, fileTree: null, fileChanges: null,
				avatar: null, codeReview: null, lastViewedFile: null,
				contextMenuOpen: { summary: false, fileView: -1 },
				scrollTop: { summary: 0, fileView: 0 }, compareWithElem: null, index: 0
			}
		});

		vm.runInContext('renderCommitDetailsView(mockView, false)', ctx);

		const cdv = document.getElementById('cdv');
		expect(cdv).not.toBeNull();
		expect(cdv!.innerHTML).toContain('cdvLoading');
		expect(cdv!.innerHTML).toContain('Loading');
		expect(cdv!.innerHTML).toContain('Commit Details');
	});

	it('should show loading text for commit comparison', () => {
		const commitElem = document.createElement('tr');
		commitElem.dataset.id = '0';
		document.body.appendChild(commitElem);

		createCdvMockView({
			expandedCommit: {
				commitHash: 'abc123', compareWithHash: 'def456', commitElem: commitElem,
				loading: true, commitDetails: null, fileTree: null, fileChanges: null,
				avatar: null, codeReview: null, lastViewedFile: null,
				contextMenuOpen: { summary: false, fileView: -1 },
				scrollTop: { summary: 0, fileView: 0 }, compareWithElem: null, index: 0
			}
		});

		vm.runInContext('renderCommitDetailsView(mockView, false)', ctx);

		const cdv = document.getElementById('cdv');
		expect(cdv).not.toBeNull();
		expect(cdv!.innerHTML).toContain('Commit Comparison');
	});

	it('should render commit details when loading is false and commitDetails available', () => {
		const commitElem = document.createElement('tr');
		commitElem.dataset.id = '0';
		document.body.appendChild(commitElem);

		createCdvMockView({
			expandedCommit: {
				commitHash: 'abc123', compareWithHash: null, commitElem: commitElem,
				loading: false,
				commitDetails: {
					hash: 'abc123',
					parents: ['def456'],
					author: 'Test Author',
					authorEmail: 'test@example.com',
					authorDate: 1000,
					committer: 'Test Committer',
					committerEmail: 'committer@example.com',
					committerDate: 1000,
					signature: null,
					body: 'Commit body text'
				},
				fileTree: { type: 'folder', name: '', folderPath: '', contents: {}, open: true, reviewed: true },
				fileChanges: [],
				avatar: null,
				codeReview: null,
				lastViewedFile: null,
				contextMenuOpen: { summary: false, fileView: -1 },
				scrollTop: { summary: 0, fileView: 0 },
				compareWithElem: null,
				index: 0
			}
		});

		vm.runInContext('renderCommitDetailsView(mockView, false)', ctx);

		const cdv = document.getElementById('cdv');
		expect(cdv).not.toBeNull();
		expect(cdv!.innerHTML).toContain('cdvSummary');
		expect(cdv!.innerHTML).toContain('cdvFiles');
		expect(cdv!.innerHTML).toContain('cdvDivider');
		expect(cdv!.innerHTML).toContain('cdvClose');
		expect(cdv!.innerHTML).toContain('Test Author');
		expect(cdv!.innerHTML).toContain('Commit body text');
	});

	it('should render comparison summary when compareWithHash is set and not loading', () => {
		const commitElem = document.createElement('tr');
		commitElem.dataset.id = '0';
		document.body.appendChild(commitElem);

		createCdvMockView({
			expandedCommit: {
				commitHash: 'abc123', compareWithHash: 'def456', commitElem: commitElem,
				loading: false,
				commitDetails: null,
				fileTree: { type: 'folder', name: '', folderPath: '', contents: {}, open: true, reviewed: true },
				fileChanges: [],
				avatar: null,
				codeReview: null,
				lastViewedFile: null,
				contextMenuOpen: { summary: false, fileView: -1 },
				scrollTop: { summary: 0, fileView: 0 },
				compareWithElem: null,
				index: 0
			}
		});

		vm.runInContext('renderCommitDetailsView(mockView, false)', ctx);

		const cdv = document.getElementById('cdv');
		expect(cdv).not.toBeNull();
		expect(cdv!.innerHTML).toContain('Displaying all changes from');
	});

	it('should create a docked CDV when isCdvDocked returns true', () => {
		const commitElem = document.createElement('tr');
		commitElem.dataset.id = '0';
		document.body.appendChild(commitElem);

		const { viewElem } = createCdvMockView({
			expandedCommit: {
				commitHash: 'abc123', compareWithHash: null, commitElem: commitElem,
				loading: true, commitDetails: null, fileTree: null, fileChanges: null,
				avatar: null, codeReview: null, lastViewedFile: null,
				contextMenuOpen: { summary: false, fileView: -1 },
				scrollTop: { summary: 0, fileView: 0 }, compareWithElem: null, index: 0
			}
		});
		ctx.mockView.isCdvDocked = () => true;

		vm.runInContext('renderCommitDetailsView(mockView, false)', ctx);

		const cdv = document.getElementById('cdv');
		expect(cdv).not.toBeNull();
		expect(cdv!.className).toContain('docked');
	});

	it('should create an inline CDV when isCdvDocked returns false', () => {
		const tableBody = document.createElement('tbody');
		const commitElem = document.createElement('tr');
		commitElem.dataset.id = '0';
		tableBody.appendChild(commitElem);
		document.body.appendChild(tableBody);

		createCdvMockView({
			expandedCommit: {
				commitHash: 'abc123', compareWithHash: null, commitElem: commitElem,
				loading: true, commitDetails: null, fileTree: null, fileChanges: null,
				avatar: null, codeReview: null, lastViewedFile: null,
				contextMenuOpen: { summary: false, fileView: -1 },
				scrollTop: { summary: 0, fileView: 0 }, compareWithElem: null, index: 0
			}
		});

		vm.runInContext('renderCommitDetailsView(mockView, false)', ctx);

		const cdv = document.getElementById('cdv');
		expect(cdv).not.toBeNull();
		expect(cdv!.className).toContain('inline');
	});

	it('should render file view type buttons when not loading', () => {
		const commitElem = document.createElement('tr');
		commitElem.dataset.id = '0';
		document.body.appendChild(commitElem);

		createCdvMockView({
			expandedCommit: {
				commitHash: 'abc123', compareWithHash: null, commitElem: commitElem,
				loading: false,
				commitDetails: {
					hash: 'abc123', parents: ['def456'],
					author: 'Author', authorEmail: 'a@b.com', authorDate: 1000,
					committer: 'Committer', committerEmail: 'c@d.com', committerDate: 1000,
					signature: null, body: 'Body'
				},
				fileTree: { type: 'folder', name: '', folderPath: '', contents: {}, open: true, reviewed: true },
				fileChanges: [],
				avatar: null, codeReview: null, lastViewedFile: null,
				contextMenuOpen: { summary: false, fileView: -1 },
				scrollTop: { summary: 0, fileView: 0 },
				compareWithElem: null, index: 0
			}
		});

		vm.runInContext('renderCommitDetailsView(mockView, false)', ctx);

		const cdv = document.getElementById('cdv');
		expect(cdv!.innerHTML).toContain('cdvFileViewTypeTree');
		expect(cdv!.innerHTML).toContain('cdvFileViewTypeList');
	});

	it('should render code review button when not loading and commit is not uncommitted', () => {
		const commitElem = document.createElement('tr');
		commitElem.dataset.id = '0';
		document.body.appendChild(commitElem);

		createCdvMockView({
			expandedCommit: {
				commitHash: 'abc123', compareWithHash: null, commitElem: commitElem,
				loading: false,
				commitDetails: {
					hash: 'abc123', parents: ['def456'],
					author: 'Author', authorEmail: 'a@b.com', authorDate: 1000,
					committer: 'Committer', committerEmail: 'c@d.com', committerDate: 1000,
					signature: null, body: 'Body'
				},
				fileTree: { type: 'folder', name: '', folderPath: '', contents: {}, open: true, reviewed: true },
				fileChanges: [],
				avatar: null, codeReview: null, lastViewedFile: null,
				contextMenuOpen: { summary: false, fileView: -1 },
				scrollTop: { summary: 0, fileView: 0 },
				compareWithElem: null, index: 0
			}
		});

		vm.runInContext('renderCommitDetailsView(mockView, false)', ctx);

		const cdv = document.getElementById('cdv');
		expect(cdv!.innerHTML).toContain('cdvCodeReview');
	});

	it('should call renderGraph when not docked', () => {
		const commitElem = document.createElement('tr');
		commitElem.dataset.id = '0';
		document.body.appendChild(commitElem);

		createCdvMockView({
			expandedCommit: {
				commitHash: 'abc123', compareWithHash: null, commitElem: commitElem,
				loading: true, commitDetails: null, fileTree: null, fileChanges: null,
				avatar: null, codeReview: null, lastViewedFile: null,
				contextMenuOpen: { summary: false, fileView: -1 },
				scrollTop: { summary: 0, fileView: 0 }, compareWithElem: null, index: 0
			}
		});

		vm.runInContext('renderCommitDetailsView(mockView, false)', ctx);

		expect(ctx.mockView.renderGraph).toHaveBeenCalled();
	});
});
