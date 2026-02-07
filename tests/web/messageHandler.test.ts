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

	loadWebFiles(ctx, ['utils.ts', 'messageHandler.ts']);

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
		createFileTree: jest.fn().mockReturnValue({}),
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
			expect(sandbox.mockGitGraph.createFileTree).toHaveBeenCalled();
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
});
