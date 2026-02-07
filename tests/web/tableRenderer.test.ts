/** @jest-environment jsdom */
import * as vm from 'vm';
import { createRepoState, createWebContext, loadWebFiles } from './webviewTestHelper';

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
		getConfig: () => defaults.config
	};

	return defaults;
}

function createFullMockView(ctx: vm.Context, sandbox: Record<string, any>, overrides: Record<string, any> = {}) {
	const tableElem = document.createElement('div');
	tableElem.id = 'commitTable';
	document.body.appendChild(tableElem);

	const footerElem = document.createElement('div');
	footerElem.id = 'footer';
	document.body.appendChild(footerElem);

	const viewElem = document.createElement('div');
	viewElem.id = 'view';
	Object.defineProperty(viewElem, 'clientWidth', { value: 1000, configurable: true });
	Object.defineProperty(viewElem, 'clientHeight', { value: 600, configurable: true });
	document.body.appendChild(viewElem);

	const controlsElem = document.createElement('div');
	controlsElem.id = 'controls';
	Object.defineProperty(controlsElem, 'clientHeight', { value: 40, configurable: true });
	document.body.appendChild(controlsElem);

	const defaults: Record<string, any> = {
		currentRepo: '/repo',
		gitRepos: { '/repo': createRepoState() },
		config: ctx.initialState.config,
		commits: [],
		commitHead: 'abc123',
		gitBranchHead: 'main',
		avatars: {},
		expandedCommit: null,
		moreCommitsAvailable: false,
		maxCommits: 300,
		onlyFollowFirstParent: false,
		scrollTop: 0,
		...overrides
	};

	const mockGraph = {
		render: jest.fn(),
		getVertexColours: jest.fn().mockReturnValue([]),
		getWidthsAtVertices: jest.fn().mockReturnValue([]),
		getMutedCommits: jest.fn().mockReturnValue({}),
		getContentWidth: jest.fn().mockReturnValue(100),
		limitMaxWidth: jest.fn()
	};

	const mockFindWidget = {
		refresh: jest.fn()
	};

	const mockBranchDropdown = {
		setOptions: jest.fn()
	};

	ctx.mockView = {
		getCurrentRepo: () => defaults.currentRepo,
		getGitRepos: () => defaults.gitRepos,
		getConfig: () => defaults.config,
		getCommits: () => defaults.commits,
		getCommitHead: () => defaults.commitHead,
		getGitBranchHead: () => defaults.gitBranchHead,
		getAvatars: () => defaults.avatars,
		getExpandedCommit: () => defaults.expandedCommit,
		getTableElem: () => tableElem,
		getFooterElem: () => footerElem,
		getViewElem: () => viewElem,
		getControlsElem: () => controlsElem,
		getGraph: () => mockGraph,
		getFindWidget: () => mockFindWidget,
		getBranchDropdown: () => mockBranchDropdown,
		getMoreCommitsAvailable: () => defaults.moreCommitsAvailable,
		getMaxCommits: () => defaults.maxCommits,
		getOnlyFollowFirstParent: () => defaults.onlyFollowFirstParent,
		getScrollTop: () => defaults.scrollTop,
		getCommitLookup: () => {
			const lookup: Record<string, number> = {};
			defaults.commits.forEach((c: any, i: number) => { lookup[c.hash] = i; });
			return lookup;
		},
		isCdvDocked: () => false,
		setRenderedGitBranchHead: jest.fn(),
		saveColumnWidths: jest.fn(),
		closeCommitDetails: jest.fn(),
		saveState: jest.fn(),
		saveRepoState: jest.fn(),
		renderGraph: jest.fn(),
		loadMoreCommits: jest.fn(),
		getCommitId: (hash: string) => {
			const lookup: Record<string, number> = {};
			defaults.commits.forEach((c: any, i: number) => { lookup[c.hash] = i; });
			return typeof lookup[hash] === 'number' ? lookup[hash] : null;
		},
		loadCommitDetails: jest.fn(),
		showCommitDetails: jest.fn(),
		requestCommitDetails: jest.fn(),
		loadCommitComparison: jest.fn(),
		showCommitComparison: jest.fn(),
		requestCommitComparison: jest.fn(),
		getNumColumns: () => 5,
		refresh: jest.fn(),
		saveRepoStateValue: jest.fn(),
		getRepoDropdown: () => mockBranchDropdown,
		getGitRemotes: () => [],
		getRefreshBtnElem: () => document.createElement('div'),
		isRefreshInProgress: () => false
	};

	sandbox.addListenerToClass = jest.fn();
	sandbox.eventOverlay = { create: jest.fn(), remove: jest.fn() };
	sandbox.contextMenu = { close: jest.fn(), show: jest.fn() };

	return { defaults, mockGraph, mockFindWidget, tableElem, footerElem, viewElem };
}

function createCommit(overrides: Record<string, any> = {}) {
	return {
		hash: 'a1b2c3d4',
		parents: ['p1p2p3p4'],
		author: 'Test Author',
		email: 'test@example.com',
		date: 1609459200,
		message: 'Test commit message',
		heads: [],
		tags: [],
		remotes: [],
		stash: null,
		...overrides
	};
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

describe('tableRenderer render functions', () => {
	let ctx: vm.Context;
	let sandbox: Record<string, any>;

	beforeEach(() => {
		document.body.innerHTML = '';
		const webCtx = createWebContext();
		ctx = webCtx.ctx;
		sandbox = webCtx.sandbox;
		sandbox.TextFormatter = jest.fn().mockImplementation(() => ({ format: (s: string) => s }));
		sandbox.generateSignatureHtml = jest.fn().mockReturnValue('');
		loadWebFiles(ctx, ['utils.ts', 'repoStateHelpers.ts', 'miscHelpers.ts', 'fileTree.ts', 'commitDetailsView.ts', 'tableRenderer.ts']);
	});

	afterEach(() => {
		document.body.innerHTML = '';
	});

	describe('renderTableView', () => {
		it('should render column headers for empty commits list', () => {
			const { tableElem, footerElem, mockGraph } = createFullMockView(ctx, sandbox);
			mockGraph.getVertexColours.mockReturnValue([]);
			mockGraph.getMutedCommits.mockReturnValue({});

			vm.runInContext('renderTableView(mockView)', ctx);

			expect(tableElem.innerHTML).toContain('tableColHeaders');
			expect(tableElem.innerHTML).toContain('Graph');
			expect(tableElem.innerHTML).toContain('Description');
			expect(footerElem.innerHTML).toBe('');
		});

		it('should render commit rows for a list of commits', () => {
			const commits = [
				createCommit({ hash: 'a1b2c3d4', message: 'First commit' }),
				createCommit({ hash: 'e5f6g7h8', message: 'Second commit' })
			];
			const { tableElem, mockGraph } = createFullMockView(ctx, sandbox, { commits });
			mockGraph.getVertexColours.mockReturnValue([0, 1]);
			mockGraph.getMutedCommits.mockReturnValue({});

			vm.runInContext('renderTableView(mockView)', ctx);

			const rows = tableElem.querySelectorAll('tr.commit');
			expect(rows.length).toBe(2);
			expect(tableElem.innerHTML).toContain('First commit');
			expect(tableElem.innerHTML).toContain('Second commit');
		});

		it('should show Load More Commits button when more commits available', () => {
			const { footerElem, mockGraph } = createFullMockView(ctx, sandbox, { moreCommitsAvailable: true });
			mockGraph.getVertexColours.mockReturnValue([]);
			mockGraph.getMutedCommits.mockReturnValue({});

			vm.runInContext('renderTableView(mockView)', ctx);

			expect(footerElem.innerHTML).toContain('loadMoreCommitsBtn');
			expect(footerElem.innerHTML).toContain('Load More Commits');
		});

		it('should not show Load More Commits button when no more commits available', () => {
			const { footerElem, mockGraph } = createFullMockView(ctx, sandbox, { moreCommitsAvailable: false });
			mockGraph.getVertexColours.mockReturnValue([]);
			mockGraph.getMutedCommits.mockReturnValue({});

			vm.runInContext('renderTableView(mockView)', ctx);

			expect(footerElem.innerHTML).toBe('');
		});

		it('should render date column when visible', () => {
			sandbox.initialState.config.defaultColumnVisibility = { date: true, author: false, commit: false };
			const commits = [createCommit()];
			const { tableElem, mockGraph } = createFullMockView(ctx, sandbox, { commits });
			mockGraph.getVertexColours.mockReturnValue([0]);
			mockGraph.getMutedCommits.mockReturnValue({});

			vm.runInContext('renderTableView(mockView)', ctx);

			expect(tableElem.innerHTML).toContain('dateCol');
			expect(tableElem.innerHTML).toContain('Date');
		});

		it('should hide date column when not visible', () => {
			sandbox.initialState.config.defaultColumnVisibility = { date: false, author: true, commit: true };
			const commits = [createCommit()];
			const { tableElem, mockGraph } = createFullMockView(ctx, sandbox, { commits });
			mockGraph.getVertexColours.mockReturnValue([0]);
			mockGraph.getMutedCommits.mockReturnValue({});

			vm.runInContext('renderTableView(mockView)', ctx);

			const headers = tableElem.querySelectorAll('th');
			const headerTexts = Array.from(headers).map(h => h.textContent);
			expect(headerTexts).not.toContain('Date');
		});

		it('should render author column when visible', () => {
			sandbox.initialState.config.defaultColumnVisibility = { date: false, author: true, commit: false };
			const commits = [createCommit({ author: 'Jane Doe', email: 'jane@example.com' })];
			const { tableElem, mockGraph } = createFullMockView(ctx, sandbox, { commits });
			mockGraph.getVertexColours.mockReturnValue([0]);
			mockGraph.getMutedCommits.mockReturnValue({});

			vm.runInContext('renderTableView(mockView)', ctx);

			expect(tableElem.innerHTML).toContain('authorCol');
			expect(tableElem.innerHTML).toContain('Jane Doe');
		});

		it('should render commit hash column when visible', () => {
			sandbox.initialState.config.defaultColumnVisibility = { date: false, author: false, commit: true };
			const commits = [createCommit({ hash: 'deadbeef12345678' })];
			const { tableElem, mockGraph } = createFullMockView(ctx, sandbox, { commits });
			mockGraph.getVertexColours.mockReturnValue([0]);
			mockGraph.getMutedCommits.mockReturnValue({});

			vm.runInContext('renderTableView(mockView)', ctx);

			expect(tableElem.innerHTML).toContain('Commit');
			expect(tableElem.innerHTML).toContain('deadbeef');
		});

		it('should mark commit as current when it matches commitHead', () => {
			const commits = [createCommit({ hash: 'abc123' })];
			const { tableElem, mockGraph } = createFullMockView(ctx, sandbox, { commits, commitHead: 'abc123' });
			mockGraph.getVertexColours.mockReturnValue([0]);
			mockGraph.getMutedCommits.mockReturnValue({});

			vm.runInContext('renderTableView(mockView)', ctx);

			const currentRow = tableElem.querySelector('tr.commit.current');
			expect(currentRow).not.toBeNull();
		});

		it('should render branch labels on commits with heads', () => {
			const commits = [createCommit({ heads: ['main', 'develop'], remotes: [] })];
			const { tableElem, mockGraph } = createFullMockView(ctx, sandbox, { commits });
			mockGraph.getVertexColours.mockReturnValue([0]);
			mockGraph.getMutedCommits.mockReturnValue({});

			vm.runInContext('renderTableView(mockView)', ctx);

			expect(tableElem.innerHTML).toContain('gitRef head');
			expect(tableElem.innerHTML).toContain('main');
			expect(tableElem.innerHTML).toContain('develop');
		});

		it('should render tag labels on commits with tags', () => {
			const commits = [createCommit({ tags: [{ name: 'v1.0.0', annotated: true }] })];
			const { tableElem, mockGraph } = createFullMockView(ctx, sandbox, { commits });
			mockGraph.getVertexColours.mockReturnValue([0]);
			mockGraph.getMutedCommits.mockReturnValue({});

			vm.runInContext('renderTableView(mockView)', ctx);

			expect(tableElem.innerHTML).toContain('gitRef tag');
			expect(tableElem.innerHTML).toContain('v1.0.0');
		});

		it('should call setRenderedGitBranchHead after rendering', () => {
			const { mockGraph } = createFullMockView(ctx, sandbox, { gitBranchHead: 'main' });
			mockGraph.getVertexColours.mockReturnValue([]);
			mockGraph.getMutedCommits.mockReturnValue({});

			vm.runInContext('renderTableView(mockView)', ctx);

			expect(ctx.mockView.setRenderedGitBranchHead).toHaveBeenCalledWith('main');
		});

		it('should call findWidget.refresh after rendering', () => {
			const { mockGraph, mockFindWidget } = createFullMockView(ctx, sandbox);
			mockGraph.getVertexColours.mockReturnValue([]);
			mockGraph.getMutedCommits.mockReturnValue({});

			vm.runInContext('renderTableView(mockView)', ctx);

			expect(mockFindWidget.refresh).toHaveBeenCalled();
		});
	});

	describe('renderGraphView', () => {
		it('should return early when currentRepo is undefined', () => {
			const { mockGraph } = createFullMockView(ctx, sandbox, { currentRepo: undefined });

			vm.runInContext('renderGraphView(mockView)', ctx);

			expect(mockGraph.render).not.toHaveBeenCalled();
		});

		it('should call graph.render with correct parameters', () => {
			createFullMockView(ctx, sandbox);

			const colHeaders = document.createElement('tr');
			colHeaders.id = 'tableColHeaders';
			document.body.appendChild(colHeaders);

			const { mockGraph } = createFullMockView(ctx, sandbox);

			vm.runInContext('renderGraphView(mockView)', ctx);

			expect(mockGraph.render).toHaveBeenCalledWith(null);
		});

		it('should pass null expandedCommit when CDV is docked', () => {
			const expandedCommit = {
				commitHash: 'abc', compareWithHash: null, commitElem: document.createElement('tr'),
				loading: false, commitDetails: null, fileTree: null, fileChanges: null,
				avatar: null, codeReview: null, lastViewedFile: null,
				contextMenuOpen: { summary: false, fileView: -1 },
				scrollTop: { summary: 0, fileView: 0 }, compareWithElem: null, index: 0
			};
			const { mockGraph } = createFullMockView(ctx, sandbox, { expandedCommit });
			ctx.mockView.isCdvDocked = () => true;

			const colHeaders = document.createElement('tr');
			colHeaders.id = 'tableColHeaders';
			document.body.appendChild(colHeaders);

			vm.runInContext('renderGraphView(mockView)', ctx);

			expect(mockGraph.render).toHaveBeenCalledWith(null);
		});
	});

	describe('renderView', () => {
		it('should call both renderTableView and renderGraphView without throwing', () => {
			const { mockGraph, mockFindWidget } = createFullMockView(ctx, sandbox);
			mockGraph.getVertexColours.mockReturnValue([]);
			mockGraph.getMutedCommits.mockReturnValue({});

			expect(() => {
				vm.runInContext('renderView(mockView)', ctx);
			}).not.toThrow();

			expect(mockGraph.render).toHaveBeenCalled();
			expect(mockFindWidget.refresh).toHaveBeenCalled();
		});
	});
});
