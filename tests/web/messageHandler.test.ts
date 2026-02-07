/** @jest-environment jsdom */
import * as vm from 'vm';
import { createWebContext, loadWebFiles } from './webviewTestHelper';

function setupContext() {
	const webCtx = createWebContext();
	const { ctx, sandbox } = webCtx;

	sandbox.dialog = {
		showError: jest.fn(),
		showConfirmation: jest.fn(),
		showForm: jest.fn(),
		closeActionRunning: jest.fn()
	};
	sandbox.contextMenu = { close: jest.fn() };
	sandbox.runAction = jest.fn();
	sandbox.sendMessage = jest.fn();
	sandbox.updateGlobalViewState = jest.fn();

	sandbox.TargetType = { Commit: 'commit', CommitDetailsView: 'cdv', Ref: 'ref', Repo: 'repo' };
	sandbox.DialogInputType = { Text: 0, TextRef: 1, Select: 2, Radio: 3, Checkbox: 4 };

	sandbox.GG.ErrorInfoExtensionPrefix = { PushTagCommitNotOnRemote: 'VSCODE_GIT_GRAPH:PUSH_TAG:COMMIT_NOT_ON_REMOTE:' };

	loadWebFiles(ctx, ['utils.ts', 'fileTree.ts', 'messageHandler.ts']);

	sandbox.mockGitGraph = {
		refresh: jest.fn(),
		requestLoadConfig: jest.fn(),
		processLoadCommitsResponse: jest.fn(),
		processLoadConfig: jest.fn(),
		processLoadRepoInfoResponse: jest.fn(),
		loadRepos: jest.fn(),
		showCommitDetails: jest.fn(),
		closeCommitDetails: jest.fn(),
		showCommitComparison: jest.fn(),
		closeCommitComparison: jest.fn(),
		loadAvatar: jest.fn(),
		getCurrentRepo: jest.fn().mockReturnValue('/repo'),
		getGitRepos: jest.fn().mockReturnValue({}),
		startCodeReview: jest.fn(),
		renderTagDetails: jest.fn(),
		endCodeReview: jest.fn()
	};
	sandbox.mockImageResizer = {
		resize: jest.fn((img: string, cb: (resized: string) => void) => cb(img))
	};

	return webCtx;
}

describe('messageHandler', () => {
	let ctx: vm.Context;
	let sandbox: Record<string, any>;

	beforeEach(() => {
		const webCtx = setupContext();
		ctx = webCtx.ctx;
		sandbox = webCtx.sandbox;
	});

	describe('addRemote', () => {
		it('should refresh when error is null', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "addRemote", error: null })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, true);
			expect(sandbox.dialog.showError).not.toHaveBeenCalled();
		});

		it('should show error when error is not null', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "addRemote", error: "failed" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Add Remote', 'failed', null, null);
			expect(sandbox.mockGitGraph.refresh).not.toHaveBeenCalled();
		});
	});

	describe('applyStash', () => {
		it('should refresh when error is null', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "applyStash", error: null })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});

		it('should show error when error is not null', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "applyStash", error: "stash error" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Apply Stash', 'stash error', null, null);
		});
	});

	describe('checkoutCommit', () => {
		it('should refresh when error is null', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "checkoutCommit", error: null })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
	});

	describe('copyToClipboard', () => {
		it('should not show dialog when error is null', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "copyToClipboard", type: "Hash", error: null })', ctx);
			expect(sandbox.dialog.showError).not.toHaveBeenCalled();
			expect(sandbox.dialog.closeActionRunning).not.toHaveBeenCalled();
		});

		it('should show error when error is not null', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "copyToClipboard", type: "Hash", error: "copy failed" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Copy Hash to Clipboard', 'copy failed', null, null);
		});
	});

	describe('deleteBranch', () => {
		it('should show confirmation when error suggests force delete', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "deleteBranch", repo: "/repo", branchName: "feature", deleteOnRemotes: [], errors: ["error: The branch \'feature\' is not fully merged. If you are sure you want to delete it, run \'git branch -D feature\'."] })', ctx);
			expect(sandbox.dialog.showConfirmation).toHaveBeenCalled();
			expect(sandbox.dialog.showError).not.toHaveBeenCalled();
		});

		it('should show error and refresh when error does not suggest force delete', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "deleteBranch", repo: "/repo", branchName: "feature", deleteOnRemotes: [], errors: ["some other error"] })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Delete Branch', 'some other error', null, null);
			expect(sandbox.dialog.showConfirmation).not.toHaveBeenCalled();
		});
	});

	describe('commitDetails', () => {
		it('should call showCommitDetails when commitDetails is not null', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "commitDetails", commitDetails: { fileChanges: [] }, codeReview: null, avatar: null, refresh: false, error: null })', ctx);
			expect(sandbox.mockGitGraph.showCommitDetails).toHaveBeenCalled();
			expect(sandbox.mockGitGraph.getCurrentRepo).toHaveBeenCalled();
			expect(sandbox.mockGitGraph.getGitRepos).toHaveBeenCalled();
		});

		it('should close commit details and show error when commitDetails is null', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "commitDetails", commitDetails: null, codeReview: null, avatar: null, refresh: false, error: "not found" })', ctx);
			expect(sandbox.mockGitGraph.closeCommitDetails).toHaveBeenCalledWith(true);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to load Commit Details', 'not found', null, null);
		});
	});

	describe('compareCommits', () => {
		it('should call showCommitComparison when error is null', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "compareCommits", commitHash: "abc", compareWithHash: "def", fileChanges: [], codeReview: null, error: null, refresh: false })', ctx);
			expect(sandbox.mockGitGraph.showCommitComparison).toHaveBeenCalled();
		});

		it('should close commit comparison and show error when error is not null', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "compareCommits", commitHash: "abc", compareWithHash: "def", fileChanges: [], codeReview: null, error: "compare failed", refresh: false })', ctx);
			expect(sandbox.mockGitGraph.closeCommitComparison).toHaveBeenCalledWith(true);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to load Commit Comparison', 'compare failed', null, null);
		});
	});

	describe('fetchAvatar', () => {
		it('should call imageResizer.resize then gitGraph.loadAvatar', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "fetchAvatar", email: "test@test.com", image: "data:image/png;base64,abc" })', ctx);
			expect(sandbox.mockImageResizer.resize).toHaveBeenCalled();
			expect(sandbox.mockGitGraph.loadAvatar).toHaveBeenCalledWith('test@test.com', 'data:image/png;base64,abc');
		});
	});

	describe('loadCommits', () => {
		it('should call processLoadCommitsResponse', () => {
			const msg = { command: 'loadCommits', data: 'test' };
			ctx.testMsg = msg;
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, testMsg)', ctx);
			expect(sandbox.mockGitGraph.processLoadCommitsResponse).toHaveBeenCalledWith(msg);
		});
	});

	describe('refresh', () => {
		it('should call gitGraph.refresh', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "refresh" })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false);
		});
	});

	describe('rebase', () => {
		it('should close action running when error is null and interactive', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "rebase", error: null, interactive: true, actionOn: "Branch" })', ctx);
			expect(sandbox.dialog.closeActionRunning).toHaveBeenCalled();
			expect(sandbox.mockGitGraph.refresh).not.toHaveBeenCalled();
		});

		it('should refresh when error is null and not interactive', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "rebase", error: null, interactive: false, actionOn: "Branch" })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false);
			expect(sandbox.dialog.closeActionRunning).not.toHaveBeenCalled();
		});

		it('should show error when error is not null', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "rebase", error: "rebase conflict", interactive: false, actionOn: "Branch" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Rebase current branch on Branch', 'rebase conflict', null, null);
		});
	});

	describe('startCodeReview', () => {
		it('should call startCodeReview when error is null', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "startCodeReview", commitHash: "abc", compareWithHash: "def", codeReview: { id: "cr1" }, error: null })', ctx);
			expect(sandbox.mockGitGraph.startCodeReview).toHaveBeenCalledWith('abc', 'def', { id: 'cr1' });
		});

		it('should show error when error is not null', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "startCodeReview", commitHash: "abc", compareWithHash: "def", codeReview: null, error: "review error" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Start Code Review', 'review error', null, null);
		});
	});

	describe('tagDetails', () => {
		it('should call renderTagDetails when details is not null', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "tagDetails", tagName: "v1.0", commitHash: "abc", details: { message: "release" }, error: null })', ctx);
			expect(sandbox.mockGitGraph.renderTagDetails).toHaveBeenCalledWith('v1.0', 'abc', { message: 'release' });
		});

		it('should show error when details is null', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "tagDetails", tagName: "v1.0", commitHash: "abc", details: null, error: "tag not found" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to retrieve Tag Details', 'tag not found', null, null);
		});
	});

	describe('branchFromStash', () => {
		it('should refresh when error is null', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "branchFromStash", error: null })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error when error is not null', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "branchFromStash", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Create Branch from Stash', 'fail', null, null);
		});
	});

	describe('checkoutBranch', () => {
		it('should refresh on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "checkoutBranch", pullAfterwards: null, errors: [null] })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error with pull note when pullAfterwards is set', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "checkoutBranch", pullAfterwards: "origin", errors: ["checkout failed"] })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Checkout Branch & Pull Changes', 'checkout failed', null, null);
		});
		it('should show error without pull note when pullAfterwards is null', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "checkoutBranch", pullAfterwards: null, errors: ["checkout failed"] })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Checkout Branch', 'checkout failed', null, null);
		});
	});

	describe('cherrypickCommit', () => {
		it('should refresh on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "cherrypickCommit", errors: [null] })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "cherrypickCommit", errors: ["conflict"] })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Cherry Pick Commit', 'conflict', null, null);
		});
	});

	describe('cleanUntrackedFiles', () => {
		it('should refresh on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "cleanUntrackedFiles", error: null })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "cleanUntrackedFiles", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Clean Untracked Files', 'fail', null, null);
		});
	});

	describe('createBranch', () => {
		it('should refresh on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "createBranch", errors: [null] })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "createBranch", errors: ["fail"] })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Create Branch', 'fail', null, null);
		});
	});

	describe('createPullRequest', () => {
		it('should refresh when partial success and push is true', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "createPullRequest", push: true, errors: [null] })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false);
		});
		it('should show error and close action running', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "createPullRequest", push: false, errors: ["fail"] })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Create Pull Request', 'fail', null, null);
		});
		it('should close action running when no error and push is false', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "createPullRequest", push: false, errors: [null] })', ctx);
			expect(sandbox.dialog.closeActionRunning).toHaveBeenCalled();
		});
	});

	describe('deleteRemote', () => {
		it('should refresh with configChanges on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "deleteRemote", error: null })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, true);
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "deleteRemote", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Delete Remote', 'fail', null, null);
		});
	});

	describe('deleteRemoteBranch', () => {
		it('should refresh on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "deleteRemoteBranch", error: null })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "deleteRemoteBranch", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Delete Remote Branch', 'fail', null, null);
		});
	});

	describe('deleteTag', () => {
		it('should refresh on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "deleteTag", error: null })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "deleteTag", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Delete Tag', 'fail', null, null);
		});
	});

	describe('deleteUserDetails', () => {
		it('should call requestLoadConfig on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "deleteUserDetails", errors: [null] })', ctx);
			expect(sandbox.mockGitGraph.requestLoadConfig).toHaveBeenCalled();
			expect(sandbox.dialog.closeActionRunning).toHaveBeenCalled();
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "deleteUserDetails", errors: ["fail"] })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Remove Git User Details', 'fail', null, null);
		});
	});

	describe('dropCommit', () => {
		it('should refresh on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "dropCommit", error: null })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "dropCommit", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Drop Commit', 'fail', null, null);
		});
	});

	describe('dropStash', () => {
		it('should refresh on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "dropStash", error: null })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "dropStash", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Drop Stash', 'fail', null, null);
		});
	});

	describe('editRemote', () => {
		it('should refresh with configChanges on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "editRemote", error: null })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, true);
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "editRemote", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Save Changes to Remote', 'fail', null, null);
		});
	});

	describe('editUserDetails', () => {
		it('should call requestLoadConfig on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "editUserDetails", errors: [null] })', ctx);
			expect(sandbox.mockGitGraph.requestLoadConfig).toHaveBeenCalled();
			expect(sandbox.dialog.closeActionRunning).toHaveBeenCalled();
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "editUserDetails", errors: ["fail"] })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Save Git User Details', 'fail', null, null);
		});
	});

	describe('exportRepoConfig', () => {
		it('should refresh on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "exportRepoConfig", error: null })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "exportRepoConfig", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Export Repository Configuration', 'fail', null, null);
		});
	});

	describe('fetch', () => {
		it('should refresh on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "fetch", error: null })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "fetch", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Fetch from Remote(s)', 'fail', null, null);
		});
	});

	describe('fetchIntoLocalBranch', () => {
		it('should refresh on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "fetchIntoLocalBranch", error: null })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "fetchIntoLocalBranch", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Fetch into Local Branch', 'fail', null, null);
		});
	});

	describe('loadConfig', () => {
		it('should call processLoadConfig', () => {
			const msg = { command: 'loadConfig', config: null, repo: '/repo' };
			ctx.testMsg2 = msg;
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, testMsg2)', ctx);
			expect(sandbox.mockGitGraph.processLoadConfig).toHaveBeenCalledWith(msg);
		});
	});

	describe('loadRepoInfo', () => {
		it('should call processLoadRepoInfoResponse', () => {
			const msg = { command: 'loadRepoInfo', branches: [], head: null, remotes: [], stashes: [], isRepo: true, error: null, refreshId: 0 };
			ctx.testMsg3 = msg;
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, testMsg3)', ctx);
			expect(sandbox.mockGitGraph.processLoadRepoInfoResponse).toHaveBeenCalledWith(msg);
		});
	});

	describe('loadRepos', () => {
		it('should call loadRepos with correct args', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "loadRepos", repos: { "/r": {} }, lastActiveRepo: "/r", loadViewTo: null })', ctx);
			expect(sandbox.mockGitGraph.loadRepos).toHaveBeenCalledWith({ '/r': {} }, '/r', null);
		});
	});

	describe('merge', () => {
		it('should refresh on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "merge", error: null, actionOn: "Branch" })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error with actionOn', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "merge", error: "conflict", actionOn: "Branch" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Merge Branch', 'conflict', null, null);
		});
	});

	describe('popStash', () => {
		it('should refresh on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "popStash", error: null })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "popStash", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Pop Stash', 'fail', null, null);
		});
	});

	describe('pruneRemote', () => {
		it('should refresh on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "pruneRemote", error: null })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "pruneRemote", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Prune Remote', 'fail', null, null);
		});
	});

	describe('pullBranch', () => {
		it('should refresh on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "pullBranch", error: null })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "pullBranch", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Pull Branch', 'fail', null, null);
		});
	});

	describe('pushBranch', () => {
		it('should refresh with configChanges on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "pushBranch", willUpdateBranchConfig: true, errors: [null] })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, true);
		});
		it('should call requestLoadConfig when error and willUpdateBranchConfig', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "pushBranch", willUpdateBranchConfig: true, errors: ["fail"] })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalled();
			expect(sandbox.mockGitGraph.requestLoadConfig).toHaveBeenCalled();
		});
		it('should show error without configChanges', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "pushBranch", willUpdateBranchConfig: false, errors: ["fail"] })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Push Branch', 'fail', null, null);
		});
	});

	describe('pushStash', () => {
		it('should refresh on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "pushStash", error: null })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error with custom message', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "pushStash", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Stash Uncommitted Changes', 'fail', null, null);
		});
	});

	describe('renameBranch', () => {
		it('should refresh on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "renameBranch", error: null })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "renameBranch", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Rename Branch', 'fail', null, null);
		});
	});

	describe('resetFileToRevision', () => {
		it('should refresh on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "resetFileToRevision", error: null })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "resetFileToRevision", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Reset File to Revision', 'fail', null, null);
		});
	});

	describe('resetToCommit', () => {
		it('should refresh on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "resetToCommit", error: null })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "resetToCommit", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Reset to Commit', 'fail', null, null);
		});
	});

	describe('revertCommit', () => {
		it('should refresh on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "revertCommit", error: null })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "revertCommit", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Revert Commit', 'fail', null, null);
		});
	});

	describe('copyFilePath', () => {
		it('should not show anything on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "copyFilePath", error: null })', ctx);
			expect(sandbox.dialog.showError).not.toHaveBeenCalled();
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "copyFilePath", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Copy File Path to Clipboard', 'fail', null, null);
		});
	});

	describe('createArchive', () => {
		it('should close action running on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "createArchive", error: null })', ctx);
			expect(sandbox.dialog.closeActionRunning).toHaveBeenCalled();
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "createArchive", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Create Archive', 'fail', null, null);
		});
	});

	describe('openExtensionSettings', () => {
		it('should not show anything on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "openExtensionSettings", error: null })', ctx);
			expect(sandbox.dialog.showError).not.toHaveBeenCalled();
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "openExtensionSettings", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Open Extension Settings', 'fail', null, null);
		});
	});

	describe('openExternalDirDiff', () => {
		it('should close action running on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "openExternalDirDiff", error: null })', ctx);
			expect(sandbox.dialog.closeActionRunning).toHaveBeenCalled();
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "openExternalDirDiff", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Open External Directory Diff', 'fail', null, null);
		});
	});

	describe('openExternalUrl', () => {
		it('should not show anything on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "openExternalUrl", error: null })', ctx);
			expect(sandbox.dialog.showError).not.toHaveBeenCalled();
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "openExternalUrl", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Open External URL', 'fail', null, null);
		});
	});

	describe('openFile', () => {
		it('should not show anything on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "openFile", error: null })', ctx);
			expect(sandbox.dialog.showError).not.toHaveBeenCalled();
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "openFile", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Open File', 'fail', null, null);
		});
	});

	describe('openTerminal', () => {
		it('should close action running on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "openTerminal", error: null })', ctx);
			expect(sandbox.dialog.closeActionRunning).toHaveBeenCalled();
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "openTerminal", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Open Terminal', 'fail', null, null);
		});
	});

	describe('setGlobalViewState', () => {
		it('should not show anything on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "setGlobalViewState", error: null })', ctx);
			expect(sandbox.dialog.showError).not.toHaveBeenCalled();
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "setGlobalViewState", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to save the Global View State', 'fail', null, null);
		});
	});

	describe('setWorkspaceViewState', () => {
		it('should not show anything on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "setWorkspaceViewState", error: null })', ctx);
			expect(sandbox.dialog.showError).not.toHaveBeenCalled();
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "setWorkspaceViewState", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to save the Workspace View State', 'fail', null, null);
		});
	});

	describe('updateCodeReview', () => {
		it('should do nothing when error is null', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "updateCodeReview", error: null })', ctx);
			expect(sandbox.dialog.showError).not.toHaveBeenCalled();
		});
		it('should show error when error is not null', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "updateCodeReview", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to update Code Review', 'fail', null, null);
		});
	});

	describe('viewDiff', () => {
		it('should not show anything on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "viewDiff", error: null })', ctx);
			expect(sandbox.dialog.showError).not.toHaveBeenCalled();
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "viewDiff", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to View Diff', 'fail', null, null);
		});
	});

	describe('viewDiffWithWorkingFile', () => {
		it('should not show anything on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "viewDiffWithWorkingFile", error: null })', ctx);
			expect(sandbox.dialog.showError).not.toHaveBeenCalled();
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "viewDiffWithWorkingFile", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to View Diff with Working File', 'fail', null, null);
		});
	});

	describe('viewFileAtRevision', () => {
		it('should not show anything on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "viewFileAtRevision", error: null })', ctx);
			expect(sandbox.dialog.showError).not.toHaveBeenCalled();
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "viewFileAtRevision", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to View File at Revision', 'fail', null, null);
		});
	});

	describe('viewScm', () => {
		it('should not show anything on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "viewScm", error: null })', ctx);
			expect(sandbox.dialog.showError).not.toHaveBeenCalled();
		});
		it('should show error', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "viewScm", error: "fail" })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to open the Source Control View', 'fail', null, null);
		});
	});

	describe('addTag', () => {
		it('should refresh on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "addTag", pushToRemote: null, tagName: "v1", repo: "/r", commitHash: "abc", errors: [null] })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error on failure', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "addTag", pushToRemote: null, tagName: "v1", repo: "/r", commitHash: "abc", errors: ["fail"] })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Add Tag', 'fail', null, null);
		});
		it('should handle PushTagCommitNotOnRemote special case', () => {
			const prefix = 'VSCODE_GIT_GRAPH:PUSH_TAG:COMMIT_NOT_ON_REMOTE:';
			const errorData = prefix + JSON.stringify(['origin']);
			ctx.errorData = errorData;
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "addTag", pushToRemote: "origin", tagName: "v1", repo: "/r", commitHash: "abc", errors: [null, errorData] })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false);
			expect(sandbox.dialog.showForm).toHaveBeenCalled();
		});
	});

	describe('pushTag', () => {
		it('should refresh on success', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "pushTag", tagName: "v1", repo: "/r", remotes: ["origin"], commitHash: "abc", errors: [null] })', ctx);
			expect(sandbox.mockGitGraph.refresh).toHaveBeenCalledWith(false, false);
		});
		it('should show error on failure', () => {
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "pushTag", tagName: "v1", repo: "/r", remotes: ["origin"], commitHash: "abc", errors: ["fail"] })', ctx);
			expect(sandbox.dialog.showError).toHaveBeenCalledWith('Unable to Push Tag', 'fail', null, null);
		});
		it('should handle PushTagCommitNotOnRemote special case', () => {
			const prefix = 'VSCODE_GIT_GRAPH:PUSH_TAG:COMMIT_NOT_ON_REMOTE:';
			const errorData2 = prefix + JSON.stringify(['origin']);
			ctx.errorData2 = errorData2;
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "pushTag", tagName: "v1", repo: "/r", remotes: ["origin"], commitHash: "abc", errors: [errorData2] })', ctx);
			expect(sandbox.dialog.showForm).toHaveBeenCalled();
		});
	});

	describe('deleteBranch force-delete callback', () => {
		it('should call runAction with forceDelete when confirmation callback is invoked', () => {
			sandbox.dialog.showConfirmation = jest.fn((_msg: string, _btn: string, callback: () => void) => callback());
			vm.runInContext('handleMessage(mockGitGraph, mockImageResizer, { command: "deleteBranch", repo: "/repo", branchName: "feature", deleteOnRemotes: [], errors: ["git branch -D"] })', ctx);
			expect(sandbox.runAction).toHaveBeenCalledWith(
				expect.objectContaining({ command: 'deleteBranch', forceDelete: true, branchName: 'feature' }),
				'Deleting Branch'
			);
		});
	});
});
