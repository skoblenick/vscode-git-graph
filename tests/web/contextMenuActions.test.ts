// @vitest-environment jsdom
import * as vm from 'vm';
import { createRepoState, createWebContext, loadWebFiles } from './webviewTestHelper';

function allVisibility() {
  return {
    branch: {
      checkout: true,
      rename: true,
      delete: true,
      merge: true,
      rebase: true,
      push: true,
      viewIssue: true,
      createPullRequest: true,
      createArchive: true,
      selectInBranchesDropdown: true,
      unselectInBranchesDropdown: true,
      copyName: true
    },
    commit: {
      addTag: true,
      createBranch: true,
      checkout: true,
      cherrypick: true,
      revert: true,
      drop: true,
      merge: true,
      rebase: true,
      reset: true,
      copyHash: true,
      copySubject: true
    },
    remoteBranch: {
      checkout: true,
      delete: true,
      fetch: true,
      merge: true,
      pull: true,
      viewIssue: true,
      createPullRequest: true,
      createArchive: true,
      selectInBranchesDropdown: true,
      unselectInBranchesDropdown: true,
      copyName: true
    },
    stash: {
      apply: true,
      createBranch: true,
      pop: true,
      drop: true,
      copyName: true,
      copyHash: true
    },
    tag: { viewDetails: true, delete: true, push: true, createArchive: true, copyName: true },
    uncommittedChanges: { stash: true, reset: true, clean: true, openSourceControlView: true },
    commitDetailsViewFile: {
      viewDiff: true,
      viewFileAtThisRevision: true,
      viewDiffWithWorkingFile: true,
      openFile: true,
      markAsReviewed: true,
      markAsNotReviewed: true,
      resetFileToThisRevision: true,
      copyAbsoluteFilePath: true,
      copyRelativeFilePath: true
    }
  };
}

function allDialogDefaults() {
  return {
    addTag: { type: 0, pushToRemote: false },
    applyStash: { reinstateIndex: false },
    cherryPick: { recordOrigin: false, noCommit: false },
    createBranch: { checkout: false },
    deleteBranch: { forceDelete: false },
    fetchIntoLocalBranch: { forceFetch: false },
    merge: { noFastForward: false, squash: false, noCommit: false },
    popStash: { reinstateIndex: false },
    pullBranch: { noFastForward: false, squash: false },
    rebase: { ignoreDate: false, interactive: false },
    resetCommit: { mode: 'mixed' },
    resetUncommitted: { mode: 'mixed' },
    stashUncommittedChanges: { includeUntracked: true }
  };
}

function createMockView(
  ctx: vm.Context,
  sandbox: Record<string, any>,
  overrides: Record<string, any> = {}
) {
  const defaults: Record<string, any> = {
    currentRepo: '/repo',
    gitRepos: { '/repo': createRepoState() },
    gitBranches: ['main', 'feature'],
    gitBranchHead: 'main',
    gitConfig: null,
    gitRemotes: ['origin'],
    gitTags: ['v1.0'],
    commits: [
      {
        hash: 'abc123def456789000000000000000000000000a',
        message: 'test',
        parents: ['def456'],
        tags: [],
        stash: null,
        date: 1000
      }
    ],
    commitLookup: { abc123def456789000000000000000000000000a: 0 },
    config: {
      ...sandbox.initialState.config,
      contextMenuActionsVisibility: allVisibility(),
      dialogDefaults: allDialogDefaults(),
      fetchAndPrune: false,
      fetchAndPruneTags: false
    },
    branchDropdown: { isSelected: () => false, selectOption: vi.fn(), unselectOption: vi.fn() },
    onlyFollowFirstParent: false,
    graphObj: { dropCommitPossible: () => true },
    pushRemote: 'origin',
    ...overrides
  };

  ctx.mockView = {
    getCurrentRepo: () => defaults.currentRepo,
    getGitRepos: () => defaults.gitRepos,
    getBranches: () => defaults.gitBranches,
    getGitBranchHead: () => defaults.gitBranchHead,
    getGitConfig: () => defaults.gitConfig,
    getGitRemotes: () => defaults.gitRemotes,
    getGitTags: () => defaults.gitTags,
    getCommits: () => defaults.commits,
    getCommitLookup: () => defaults.commitLookup,
    getConfig: () => defaults.config,
    getBranchDropdown: () => defaults.branchDropdown,
    getOnlyFollowFirstParent: () => defaults.onlyFollowFirstParent,
    getGraph: () => defaults.graphObj,
    getPushRemote: (_branch: string) => defaults.pushRemote,
    saveRepoState: vi.fn()
  };

  return defaults;
}

function createTarget(ctx: vm.Context, overrides: Record<string, any> = {}) {
  const elem = document.createElement('div');
  ctx.mockTarget = {
    type: 'ref',
    elem,
    hash: 'abc123def456789000000000000000000000000a',
    ref: 'feature',
    ...overrides
  };
  return ctx.mockTarget;
}

describe('contextMenuActions', () => {
  let ctx: vm.Context;
  let sandbox: Record<string, any>;
  let vsCodeApi: { getState: Mock; postMessage: Mock; setState: Mock };

  beforeEach(() => {
    const webCtx = createWebContext();
    ctx = webCtx.ctx;
    sandbox = webCtx.sandbox;
    vsCodeApi = webCtx.vsCodeApi;

    sandbox.dialog = {
      showError: vi.fn(),
      showConfirmation: vi.fn(),
      showForm: vi.fn(),
      showRefInput: vi.fn(),
      showSelect: vi.fn(),
      showCheckbox: vi.fn(),
      showTwoButtons: vi.fn(),
      showMultiSelect: vi.fn(),
      showActionRunning: vi.fn(),
      closeActionRunning: vi.fn()
    };
    sandbox.contextMenu = { close: vi.fn() };
    sandbox.updateGlobalViewState = vi.fn();
    sandbox.globalState = { alwaysAcceptCheckoutCommit: false, pushTagSkipRemoteCheck: false };

    sandbox.parseIssueLinkingConfig = vi.fn().mockReturnValue(null);
    sandbox.generateIssueLinkFromMatch = vi.fn();

    loadWebFiles(ctx, ['utils.ts', 'miscHelpers.ts', 'contextMenuActions.ts']);
  });

  describe('buildBranchContextMenuActions', () => {
    it('should return correct structure (array of arrays)', () => {
      createMockView(ctx, sandbox);
      createTarget(ctx);
      const result = vm.runInContext('buildBranchContextMenuActions(mockView, mockTarget)', ctx);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(4);
      result.forEach((group: any[]) => {
        expect(Array.isArray(group)).toBe(true);
        group.forEach((action: any) => {
          expect(action).toHaveProperty('title');
          expect(action).toHaveProperty('visible');
          expect(action).toHaveProperty('onClick');
        });
      });
    });

    it('should not show Checkout when branch is HEAD', () => {
      createMockView(ctx, sandbox);
      createTarget(ctx, { ref: 'main' });
      const result = vm.runInContext('buildBranchContextMenuActions(mockView, mockTarget)', ctx);
      const checkoutAction = result[0].find((a: any) => a.title === 'Checkout Branch');
      expect(checkoutAction.visible).toBe(false);
    });

    it('should not show Delete when branch is HEAD', () => {
      createMockView(ctx, sandbox);
      createTarget(ctx, { ref: 'main' });
      const result = vm.runInContext('buildBranchContextMenuActions(mockView, mockTarget)', ctx);
      const deleteAction = result[0].find((a: any) => a.title.startsWith('Delete Branch'));
      expect(deleteAction.visible).toBe(false);
    });

    it('should send correct message when Copy Branch Name is clicked', () => {
      createMockView(ctx, sandbox);
      createTarget(ctx, { ref: 'feature' });
      const result = vm.runInContext('buildBranchContextMenuActions(mockView, mockTarget)', ctx);
      const copyAction = result[3].find((a: any) => a.title === 'Copy Branch Name to Clipboard');
      expect(copyAction.visible).toBe(true);
      copyAction.onClick();
      expect(vsCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'copyToClipboard',
        type: 'Branch Name',
        data: 'feature'
      });
    });

    it('should show Push when remotes exist', () => {
      createMockView(ctx, sandbox, { gitRemotes: ['origin'] });
      createTarget(ctx, { ref: 'feature' });
      const result = vm.runInContext('buildBranchContextMenuActions(mockView, mockTarget)', ctx);
      const pushAction = result[0].find((a: any) => a.title.startsWith('Push Branch'));
      expect(pushAction.visible).toBe(true);
    });

    it('should not show Push when no remotes', () => {
      createMockView(ctx, sandbox, { gitRemotes: [] });
      createTarget(ctx, { ref: 'feature' });
      const result = vm.runInContext('buildBranchContextMenuActions(mockView, mockTarget)', ctx);
      const pushAction = result[0].find((a: any) => a.title.startsWith('Push Branch'));
      expect(pushAction.visible).toBe(false);
    });
  });

  describe('buildCommitContextMenuActions', () => {
    it('should return correct structure', () => {
      createMockView(ctx, sandbox);
      createTarget(ctx, { hash: 'abc123def456789000000000000000000000000a' });
      const result = vm.runInContext('buildCommitContextMenuActions(mockView, mockTarget)', ctx);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(4);
      result.forEach((group: any[]) => {
        expect(Array.isArray(group)).toBe(true);
      });
    });

    it('should send correct message when Copy Commit Hash is clicked', () => {
      createMockView(ctx, sandbox);
      createTarget(ctx, { hash: 'abc123def456789000000000000000000000000a' });
      const result = vm.runInContext('buildCommitContextMenuActions(mockView, mockTarget)', ctx);
      const copyAction = result[3].find((a: any) => a.title === 'Copy Commit Hash to Clipboard');
      expect(copyAction.visible).toBe(true);
      copyAction.onClick();
      expect(vsCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'copyToClipboard',
        type: 'Commit Hash',
        data: 'abc123def456789000000000000000000000000a'
      });
    });
  });

  describe('buildRemoteBranchContextMenuActions', () => {
    it('should return correct structure', () => {
      createMockView(ctx, sandbox);
      createTarget(ctx, { ref: 'origin/feature' });
      const result = vm.runInContext(
        "buildRemoteBranchContextMenuActions(mockView, 'origin', mockTarget)",
        ctx
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(4);
    });

    it('should extract remote branch name correctly for Copy action', () => {
      createMockView(ctx, sandbox);
      createTarget(ctx, { ref: 'origin/feature' });
      const result = vm.runInContext(
        "buildRemoteBranchContextMenuActions(mockView, 'origin', mockTarget)",
        ctx
      );
      const copyAction = result[3].find((a: any) => a.title === 'Copy Branch Name to Clipboard');
      expect(copyAction.visible).toBe(true);
      copyAction.onClick();
      expect(vsCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'copyToClipboard',
        type: 'Branch Name',
        data: 'origin/feature'
      });
    });
  });

  describe('buildStashContextMenuActions', () => {
    it('should return correct structure with visible actions', () => {
      createMockView(ctx, sandbox);
      createTarget(ctx, {
        ref: 'refs/stash@{0}',
        hash: 'abc123def456789000000000000000000000000a'
      });
      const result = vm.runInContext('buildStashContextMenuActions(mockView, mockTarget)', ctx);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      const applyAction = result[0].find((a: any) => a.title.startsWith('Apply Stash'));
      expect(applyAction.visible).toBe(true);
      const popAction = result[0].find((a: any) => a.title.startsWith('Pop Stash'));
      expect(popAction.visible).toBe(true);
      const dropAction = result[0].find((a: any) => a.title.startsWith('Drop Stash'));
      expect(dropAction.visible).toBe(true);
    });

    it('should send correct message when Copy Stash Name is clicked', () => {
      createMockView(ctx, sandbox);
      createTarget(ctx, {
        ref: 'refs/stash@{0}',
        hash: 'abc123def456789000000000000000000000000a'
      });
      const result = vm.runInContext('buildStashContextMenuActions(mockView, mockTarget)', ctx);
      const copyAction = result[1].find((a: any) => a.title === 'Copy Stash Name to Clipboard');
      expect(copyAction.visible).toBe(true);
      copyAction.onClick();
      expect(vsCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'copyToClipboard',
        type: 'Stash Name',
        data: 'refs/stash@{0}'
      });
    });
  });

  describe('buildTagContextMenuActions', () => {
    it('should show View Details for annotated tag', () => {
      createMockView(ctx, sandbox);
      createTarget(ctx, { ref: 'v1.0', hash: 'abc123def456789000000000000000000000000a' });
      const result = vm.runInContext('buildTagContextMenuActions(mockView, true, mockTarget)', ctx);
      const viewDetails = result[0].find((a: any) => a.title === 'View Details');
      expect(viewDetails.visible).toBe(true);
    });

    it('should not show View Details for lightweight tag', () => {
      createMockView(ctx, sandbox);
      createTarget(ctx, { ref: 'v1.0', hash: 'abc123def456789000000000000000000000000a' });
      const result = vm.runInContext(
        'buildTagContextMenuActions(mockView, false, mockTarget)',
        ctx
      );
      const viewDetails = result[0].find((a: any) => a.title === 'View Details');
      expect(viewDetails.visible).toBe(false);
    });
  });

  describe('buildUncommittedChangesContextMenuActions', () => {
    it('should return correct structure', () => {
      createMockView(ctx, sandbox);
      createTarget(ctx, { hash: 'abc123def456789000000000000000000000000a' });
      const result = vm.runInContext(
        'buildUncommittedChangesContextMenuActions(mockView, mockTarget)',
        ctx
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      const stashAction = result[0].find((a: any) => a.title.startsWith('Stash uncommitted'));
      expect(stashAction.visible).toBe(true);
      const resetAction = result[1].find((a: any) => a.title.startsWith('Reset uncommitted'));
      expect(resetAction.visible).toBe(true);
      const openScm = result[2].find((a: any) => a.title === 'Open Source Control View');
      expect(openScm.visible).toBe(true);
    });
  });

  describe('fetchFromRemotesAction', () => {
    it('should call runAction with correct parameters', () => {
      createMockView(ctx, sandbox);
      vm.runInContext('fetchFromRemotesAction(mockView)', ctx);
      expect(sandbox.dialog.showActionRunning).toHaveBeenCalledWith('Fetching from Remote(s)');
      expect(vsCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'fetch',
        repo: '/repo',
        name: null,
        prune: false,
        pruneTags: false
      });
    });
  });

  describe('deleteTagAction', () => {
    it('should call runAction with deleteOnRemote', () => {
      createMockView(ctx, sandbox);
      vm.runInContext("deleteTagAction(mockView, 'v1.0', 'origin')", ctx);
      expect(sandbox.dialog.showActionRunning).toHaveBeenCalledWith('Deleting Tag');
      expect(vsCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'deleteTag',
        repo: '/repo',
        tagName: 'v1.0',
        deleteOnRemote: 'origin'
      });
    });
  });
});
