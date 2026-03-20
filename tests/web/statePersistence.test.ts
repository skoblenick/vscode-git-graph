/** @jest-environment jsdom */
import * as vm from 'vm';
import { createRepoState, createWebContext, loadWebFiles } from './webviewTestHelper';

function createMockView(ctx: vm.Context, overrides: Record<string, any> = {}) {
  const defaults: Record<string, any> = {
    currentRepo: '/repo',
    currentRepoLoading: false,
    gitRepos: { '/repo': createRepoState() },
    gitBranches: ['main'],
    gitBranchHead: 'main',
    gitConfig: null,
    gitRemotes: [],
    gitStashes: [],
    gitTags: [],
    commits: [],
    commitHead: 'abc123',
    avatars: {},
    currentBranches: null,
    moreCommitsAvailable: false,
    maxCommits: 300,
    onlyFollowFirstParent: false,
    expandedCommit: null,
    scrollTop: 0,
    findWidgetState: {},
    settingsWidgetState: null,
    config: ctx.initialState.config,
    ...overrides
  };

  ctx.mockView = {
    getCurrentRepo: () => defaults.currentRepo,
    getCurrentRepoLoading: () => defaults.currentRepoLoading,
    getGitRepos: () => defaults.gitRepos,
    getGitBranches: () => defaults.gitBranches,
    getGitBranchHead: () => defaults.gitBranchHead,
    getGitConfig: () => defaults.gitConfig,
    getGitRemotes: () => defaults.gitRemotes,
    getGitStashes: () => defaults.gitStashes,
    getGitTags: () => defaults.gitTags,
    getCommits: () => defaults.commits,
    getCommitHead: () => defaults.commitHead,
    getAvatars: () => defaults.avatars,
    getCurrentBranches: () => defaults.currentBranches,
    getMoreCommitsAvailable: () => defaults.moreCommitsAvailable,
    getMaxCommits: () => defaults.maxCommits,
    getOnlyFollowFirstParent: () => defaults.onlyFollowFirstParent,
    getExpandedCommit: () => defaults.expandedCommit,
    getScrollTop: () => defaults.scrollTop,
    getFindWidget: () => ({ getState: () => defaults.findWidgetState }),
    getSettingsWidget: () => ({ getState: () => defaults.settingsWidgetState }),
    getConfig: () => defaults.config,
    setExpandedCommit: (ec: any) => {
      defaults.expandedCommit = ec;
    }
  };

  return defaults;
}

describe('statePersistence', () => {
  let ctx: vm.Context;
  let sandbox: Record<string, any>;
  let vsCodeApi: { getState: jest.Mock; postMessage: jest.Mock; setState: jest.Mock };

  beforeEach(() => {
    const webCtx = createWebContext();
    ctx = webCtx.ctx;
    sandbox = webCtx.sandbox;
    vsCodeApi = webCtx.vsCodeApi;
    loadWebFiles(ctx, ['utils.ts', 'repoStateHelpers.ts', 'statePersistence.ts']);
  });

  describe('saveViewState', () => {
    it('should call setState with correct shape when no expanded commit', () => {
      createMockView(ctx);
      vm.runInContext('saveViewState(mockView)', ctx);
      expect(vsCodeApi.setState).toHaveBeenCalledTimes(1);
      const state = vsCodeApi.setState.mock.calls[0][0];
      expect(state.currentRepo).toBe('/repo');
      expect(state.expandedCommit).toBeNull();
      expect(state.commits).toEqual([]);
    });

    it('should strip commitElem and compareWithElem from expanded commit', () => {
      createMockView(ctx, {
        expandedCommit: {
          index: 0,
          commitHash: 'abc',
          commitElem: document.createElement('div'),
          compareWithHash: null,
          compareWithElem: null,
          commitDetails: null,
          fileChanges: null,
          fileTree: null,
          avatar: null,
          codeReview: null,
          lastViewedFile: null,
          loading: false,
          scrollTop: { summary: 0, fileView: 0 },
          contextMenuOpen: { summary: true, fileView: 2 }
        }
      });
      vm.runInContext('saveViewState(mockView)', ctx);
      const state = vsCodeApi.setState.mock.calls[0][0];
      expect(state.expandedCommit).not.toBeNull();
      expect(state.expandedCommit.commitElem).toBeNull();
      expect(state.expandedCommit.compareWithElem).toBeNull();
      expect(state.expandedCommit.contextMenuOpen).toEqual({ summary: false, fileView: -1 });
      expect(state.expandedCommit.commitHash).toBe('abc');
    });
  });

  describe('saveRepoState', () => {
    it('should send setRepoState message with current repo state', () => {
      const repoState = createRepoState();
      createMockView(ctx, { gitRepos: { '/repo': repoState } });
      vm.runInContext('saveRepoState(mockView)', ctx);
      expect(vsCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'setRepoState',
        repo: '/repo',
        state: repoState
      });
    });
  });

  describe('saveColumnWidths', () => {
    it('should store column widths at indices [0,2,3,4]', () => {
      const repoState = createRepoState();
      const viewData = createMockView(ctx, { gitRepos: { '/repo': repoState } });
      ctx.testWidths = [100, 200, 150, 80, 60];
      vm.runInContext('saveColumnWidths(mockView, testWidths)', ctx);
      expect(viewData.gitRepos['/repo'].columnWidths).toEqual([100, 150, 80, 60]);
      expect(vsCodeApi.postMessage).toHaveBeenCalled();
    });
  });

  describe('saveRepoStateValue', () => {
    it('should persist value when repo matches current repo', () => {
      const repoState = createRepoState({ commitOrdering: 'default' });
      createMockView(ctx, { gitRepos: { '/repo': repoState } });
      vm.runInContext('saveRepoStateValue(mockView, "/repo", "commitOrdering", "date")', ctx);
      expect(vsCodeApi.postMessage).toHaveBeenCalled();
    });

    it('should not persist value when repo does not match', () => {
      createMockView(ctx);
      vm.runInContext('saveRepoStateValue(mockView, "/other-repo", "commitOrdering", "date")', ctx);
      expect(vsCodeApi.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('saveExpandedCommitLoading', () => {
    it('should set expanded commit with loading state', () => {
      const viewData = createMockView(ctx);
      const commitElem = document.createElement('tr');
      ctx.testCommitElem = commitElem;
      vm.runInContext(
        'saveExpandedCommitLoading(mockView, 5, "def456", testCommitElem, null, null)',
        ctx
      );
      expect(viewData.expandedCommit).not.toBeNull();
      expect(viewData.expandedCommit.index).toBe(5);
      expect(viewData.expandedCommit.commitHash).toBe('def456');
      expect(viewData.expandedCommit.loading).toBe(true);
      expect(viewData.expandedCommit.commitDetails).toBeNull();
      expect(viewData.expandedCommit.fileChanges).toBeNull();
      expect(viewData.expandedCommit.contextMenuOpen).toEqual({ summary: false, fileView: -1 });
      expect(vsCodeApi.setState).toHaveBeenCalled();
    });

    it('should set expanded commit with compare hash', () => {
      const viewData = createMockView(ctx);
      const commitElem = document.createElement('tr');
      const compareElem = document.createElement('tr');
      ctx.testCommitElem = commitElem;
      ctx.testCompareElem = compareElem;
      vm.runInContext(
        'saveExpandedCommitLoading(mockView, 3, "abc", testCommitElem, "xyz", testCompareElem)',
        ctx
      );
      expect(viewData.expandedCommit.compareWithHash).toBe('xyz');
    });
  });
});
