/* State Persistence — save/restore webview state */

function saveViewState(view: GitGraphView) {
	let expandedCommit;
	const ec = view.getExpandedCommit();
	if (ec !== null) {
		expandedCommit = Object.assign({}, ec);
		expandedCommit.commitElem = null;
		expandedCommit.compareWithElem = null;
		expandedCommit.contextMenuOpen = {
			summary: false,
			fileView: -1
		};
	} else {
		expandedCommit = null;
	}

	VSCODE_API.setState({
		currentRepo: view.getCurrentRepo(),
		currentRepoLoading: view.getCurrentRepoLoading(),
		gitRepos: view.getGitRepos(),
		gitBranches: view.getGitBranches(),
		gitBranchHead: view.getGitBranchHead(),
		gitConfig: view.getGitConfig(),
		gitRemotes: view.getGitRemotes(),
		gitStashes: view.getGitStashes(),
		gitTags: view.getGitTags(),
		commits: view.getCommits() as GG.GitCommit[],
		commitHead: view.getCommitHead(),
		avatars: view.getAvatars(),
		currentBranches: view.getCurrentBranches(),
		moreCommitsAvailable: view.getMoreCommitsAvailable(),
		maxCommits: view.getMaxCommits(),
		onlyFollowFirstParent: view.getOnlyFollowFirstParent(),
		expandedCommit: expandedCommit,
		scrollTop: view.getScrollTop(),
		findWidget: view.getFindWidget().getState(),
		settingsWidget: view.getSettingsWidget().getState()
	});
}

function saveRepoState(view: GitGraphView) {
	sendMessage({ command: 'setRepoState', repo: view.getCurrentRepo(), state: view.getGitRepos()[view.getCurrentRepo()] });
}

function saveColumnWidths(view: GitGraphView, columnWidths: GG.ColumnWidth[]) {
	view.getGitRepos()[view.getCurrentRepo()].columnWidths = [columnWidths[0], columnWidths[2], columnWidths[3], columnWidths[4]];
	saveRepoState(view);
}

function saveExpandedCommitLoading(view: GitGraphView, index: number, commitHash: string, commitElem: HTMLElement, compareWithHash: string | null, compareWithElem: HTMLElement | null) {
	view.setExpandedCommit({
		index: index,
		commitHash: commitHash,
		commitElem: commitElem,
		compareWithHash: compareWithHash,
		compareWithElem: compareWithElem,
		commitDetails: null,
		fileChanges: null,
		fileTree: null,
		avatar: null,
		codeReview: null,
		lastViewedFile: null,
		loading: true,
		scrollTop: {
			summary: 0,
			fileView: 0
		},
		contextMenuOpen: {
			summary: false,
			fileView: -1
		}
	});
	saveViewState(view);
}

function saveRepoStateValue<K extends keyof GG.GitRepoState>(view: GitGraphView, repo: string, key: K, value: GG.GitRepoState[K]) {
	if (repo === view.getCurrentRepo()) {
		view.getGitRepos()[view.getCurrentRepo()][key] = value;
		saveRepoState(view);
	}
}

function restoreFromPrevState(view: GitGraphView, prevState: WebViewState | null): GG.LoadGitGraphViewTo {
	if (prevState && !prevState.currentRepoLoading && typeof view.getGitRepos()[prevState.currentRepo] !== 'undefined') {
		view.setCurrentRepo(prevState.currentRepo);
		view.setCurrentBranches(prevState.currentBranches);
		view.setMaxCommits(prevState.maxCommits);
		view.setExpandedCommit(prevState.expandedCommit);
		view.setAvatars(prevState.avatars);
		view.setGitConfig(prevState.gitConfig);
		view.loadRepoInfo(prevState.gitBranches, prevState.gitBranchHead, prevState.gitRemotes, prevState.gitStashes, true);
		view.loadCommits(prevState.commits, prevState.commitHead, prevState.gitTags, prevState.moreCommitsAvailable, prevState.onlyFollowFirstParent);
		view.getFindWidget().restoreState(prevState.findWidget);
		view.getSettingsWidget().restoreState(prevState.settingsWidget);
		view.getShowRemoteBranchesElem().checked = getShowRemoteBranches(view.getGitRepos()[prevState.currentRepo].showRemoteBranchesV2);
	}

	let loadViewTo = initialState.loadViewTo;
	if (loadViewTo === null && prevState && prevState.currentRepoLoading && typeof prevState.currentRepo !== 'undefined') {
		loadViewTo = { repo: prevState.currentRepo };
	}

	return loadViewTo;
}
