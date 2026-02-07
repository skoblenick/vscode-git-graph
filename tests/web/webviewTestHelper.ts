import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

const GG_ENUMS: Record<string, any> = {
	BooleanOverride: { Default: 0, Enabled: 1, Disabled: 2 },
	CommitDetailsViewLocation: { Inline: 0, DockedToBottom: 1 },
	CommitOrdering: { Date: 'date', AuthorDate: 'author-date', Topological: 'topo' },
	DateFormatType: { DateAndTime: 0, DateOnly: 1, Relative: 2 },
	FileViewType: { Default: 0, Tree: 1, List: 2 },
	GitSignatureStatus: { GoodAndValid: 'G', GoodWithUnknownValidity: 'U', GoodButExpired: 'X', GoodButExpiredKey: 'Y', GoodButRevokedKey: 'R', CannotBeChecked: 'E', Bad: 'B' },
	GraphStyle: { Rounded: 0, Angular: 1 },
	GraphUncommittedChangesStyle: { OpenCircleAtTheUncommittedChanges: 0, OpenCircleAtTheCheckedOutCommit: 1 },
	RefLabelAlignment: { Normal: 0, BranchesOnLeftAndTagsOnRight: 1, BranchesAlignedToGraphAndTagsOnRight: 2 },
	RepoCommitOrdering: { Default: 'default', Date: 'date', AuthorDate: 'author-date', Topological: 'topo' },
	RepoDropdownOrder: { FullPath: 0, Name: 1, WorkspaceFullPath: 2 },
	TagType: { Annotated: 0, Lightweight: 1 },
};

export function createWebContext() {
	const vsCodeApi = {
		getState: jest.fn().mockReturnValue(null),
		postMessage: jest.fn(),
		setState: jest.fn()
	};

	const sandbox: Record<string, any> = {
		window,
		document,
		HTMLElement,
		HTMLInputElement: window.HTMLInputElement,
		SVGElement: (window as any).SVGElement || function () { },
		MouseEvent,
		KeyboardEvent,
		MutationObserver,
		Event,
		Element,
		Node,
		NodeList,
		console,
		setTimeout,
		clearTimeout,
		setInterval,
		clearInterval,
		Image: window.Image,
		GG: GG_ENUMS,
		acquireVsCodeApi: () => vsCodeApi,
		initialState: createMinimalInitialState(),
		globalState: createMinimalGlobalState(),
		workspaceState: createMinimalWorkspaceState(),
	};

	const ctx = vm.createContext(sandbox);
	return { ctx, vsCodeApi, sandbox };
}

export function createMinimalInitialState(): any {
	return {
		config: {
			commitDetailsView: {
				autoCenter: true,
				fileTreeCompactFolders: true,
				fileViewType: 0,
				location: 0
			},
			commitOrdering: 'date',
			contextMenuActionsVisibility: {},
			customBranchGlobPatterns: [],
			customEmojiShortcodeMappings: [],
			customPullRequestProviders: [],
			dateFormat: { type: 0, iso: false },
			defaultColumnVisibility: { date: true, author: true, commit: true },
			dialogDefaults: {},
			enhancedAccessibility: false,
			fetchAndPrune: false,
			fetchAndPruneTags: false,
			fetchAvatars: false,
			graph: {
				colours: ['#0085d9', '#d9008f', '#00d90a', '#d98500', '#a300d9', '#009dd9', '#d90000', '#00d9cc', '#e138e8', '#85d900', '#dc5b23', '#6b40db'],
				style: 0,
				grid: { x: 16, y: 24, offsetX: 16, offsetY: 12, expandY: 0 },
				uncommittedChanges: 0
			},
			includeCommitsMentionedByReflogs: false,
			initialLoadCommits: 300,
			keybindings: { find: 'f', refresh: 'r', scrollToHead: null, scrollToStash: null },
			loadMoreCommits: 100,
			loadMoreCommitsAutomatically: true,
			markdown: false,
			mute: { commitsNotAncestorsOfHead: false, mergeCommits: false },
			onlyFollowFirstParent: false,
			onRepoLoad: { scrollToHead: false, showCheckedOutBranch: true, showSpecificBranches: [] },
			referenceLabels: { branchLabelsAlignedToGraph: false, combineLocalAndRemoteBranchLabels: true, tagLabelsOnRight: false },
			repoDropdownOrder: 0,
			showRemoteBranches: true,
			showStashes: true,
			showTags: true
		},
		lastActiveRepo: null,
		loadViewTo: null,
		repos: {},
		loadRepoInfoRefreshId: 0,
		loadCommitsRefreshId: 0
	};
}

export function createMinimalGlobalState(): any {
	return {
		alwaysAcceptCheckoutCommit: false,
		issueLinkingConfig: null,
		pushTagSkipRemoteCheck: false
	};
}

export function createMinimalWorkspaceState(): any {
	return {
		findIsCaseSensitive: false,
		findIsRegex: false,
		findOpenCommitDetailsView: false
	};
}

export function loadWebFile(ctx: vm.Context, fileName: string) {
	const filePath = path.resolve(__dirname, '../../web', fileName);
	const source = fs.readFileSync(filePath, 'utf8');
	const result = ts.transpileModule(source, {
		compilerOptions: {
			target: ts.ScriptTarget.ES2017,
			module: ts.ModuleKind.None,
			strict: true,
			noImplicitAny: true,
			removeComments: true,
		},
		fileName: filePath
	});
	vm.runInContext(result.outputText, ctx, { filename: fileName });
}

export function loadWebFiles(ctx: vm.Context, fileNames: string[]) {
	for (const f of fileNames) {
		loadWebFile(ctx, f);
	}
}

export function createRepoState(overrides: Partial<any> = {}): any {
	return {
		cdvDivider: 0.5,
		cdvHeight: 250,
		columnWidths: null,
		commitOrdering: 'default',
		fileViewType: 0,
		hideRemotes: [],
		includeCommitsMentionedByReflogs: 0,
		issueLinkingConfig: null,
		lastImportAt: 0,
		name: null,
		onlyFollowFirstParent: 0,
		onRepoLoadShowCheckedOutBranch: 0,
		onRepoLoadShowSpecificBranches: null,
		pullRequestConfig: null,
		showRemoteBranches: true,
		showRemoteBranchesV2: 0,
		showStashes: 0,
		showTags: 0,
		workspaceFolderIndex: null,
		...overrides
	};
}
