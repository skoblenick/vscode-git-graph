// @vitest-environment jsdom
import * as vm from 'vm';
import { createWebContext, loadWebFiles } from './webviewTestHelper';

describe('repoStateHelpers', () => {
  let ctx: vm.Context;
  let sandbox: Record<string, any>;

  beforeEach(() => {
    const webCtx = createWebContext();
    ctx = webCtx.ctx;
    sandbox = webCtx.sandbox;
    loadWebFiles(ctx, ['utils.ts', 'repoStateHelpers.ts']);
  });

  describe('getCommitOrdering', () => {
    it('should return config commitOrdering when repo value is default', () => {
      sandbox.initialState.config.commitOrdering = 'date';
      const result = vm.runInContext('getCommitOrdering("default")', ctx);
      expect(result).toBe('date');
    });

    it('should return config commitOrdering (topo) when repo value is default', () => {
      sandbox.initialState.config.commitOrdering = 'topo';
      const result = vm.runInContext('getCommitOrdering("default")', ctx);
      expect(result).toBe('topo');
    });

    it('should return "date" for Date ordering', () => {
      const result = vm.runInContext('getCommitOrdering("date")', ctx);
      expect(result).toBe('date');
    });

    it('should return "author-date" for AuthorDate ordering', () => {
      const result = vm.runInContext('getCommitOrdering("author-date")', ctx);
      expect(result).toBe('author-date');
    });

    it('should return "topo" for Topological ordering', () => {
      const result = vm.runInContext('getCommitOrdering("topo")', ctx);
      expect(result).toBe('topo');
    });
  });

  describe('getShowRemoteBranches', () => {
    it('should return config value when Default (0)', () => {
      sandbox.initialState.config.showRemoteBranches = true;
      expect(vm.runInContext('getShowRemoteBranches(0)', ctx)).toBe(true);

      sandbox.initialState.config.showRemoteBranches = false;
      expect(vm.runInContext('getShowRemoteBranches(0)', ctx)).toBe(false);
    });

    it('should return true when Enabled (1)', () => {
      expect(vm.runInContext('getShowRemoteBranches(1)', ctx)).toBe(true);
    });

    it('should return false when Disabled (2)', () => {
      expect(vm.runInContext('getShowRemoteBranches(2)', ctx)).toBe(false);
    });
  });

  describe('getShowStashes', () => {
    it('should return config value when Default (0)', () => {
      sandbox.initialState.config.showStashes = false;
      expect(vm.runInContext('getShowStashes(0)', ctx)).toBe(false);
    });

    it('should return true when Enabled (1)', () => {
      expect(vm.runInContext('getShowStashes(1)', ctx)).toBe(true);
    });

    it('should return false when Disabled (2)', () => {
      expect(vm.runInContext('getShowStashes(2)', ctx)).toBe(false);
    });
  });

  describe('getShowTags', () => {
    it('should return config value when Default (0)', () => {
      sandbox.initialState.config.showTags = true;
      expect(vm.runInContext('getShowTags(0)', ctx)).toBe(true);
    });

    it('should return true when Enabled (1)', () => {
      expect(vm.runInContext('getShowTags(1)', ctx)).toBe(true);
    });

    it('should return false when Disabled (2)', () => {
      expect(vm.runInContext('getShowTags(2)', ctx)).toBe(false);
    });
  });

  describe('getIncludeCommitsMentionedByReflogs', () => {
    it('should return config value when Default (0)', () => {
      sandbox.initialState.config.includeCommitsMentionedByReflogs = false;
      expect(vm.runInContext('getIncludeCommitsMentionedByReflogs(0)', ctx)).toBe(false);
    });

    it('should return true when Enabled (1)', () => {
      expect(vm.runInContext('getIncludeCommitsMentionedByReflogs(1)', ctx)).toBe(true);
    });

    it('should return false when Disabled (2)', () => {
      expect(vm.runInContext('getIncludeCommitsMentionedByReflogs(2)', ctx)).toBe(false);
    });
  });

  describe('getOnlyFollowFirstParent', () => {
    it('should return config value when Default (0)', () => {
      sandbox.initialState.config.onlyFollowFirstParent = true;
      expect(vm.runInContext('getOnlyFollowFirstParent(0)', ctx)).toBe(true);
    });

    it('should return true when Enabled (1)', () => {
      expect(vm.runInContext('getOnlyFollowFirstParent(1)', ctx)).toBe(true);
    });

    it('should return false when Disabled (2)', () => {
      expect(vm.runInContext('getOnlyFollowFirstParent(2)', ctx)).toBe(false);
    });
  });

  describe('getOnRepoLoadShowCheckedOutBranch', () => {
    it('should return config value when Default (0)', () => {
      sandbox.initialState.config.onRepoLoad.showCheckedOutBranch = true;
      expect(vm.runInContext('getOnRepoLoadShowCheckedOutBranch(0)', ctx)).toBe(true);

      sandbox.initialState.config.onRepoLoad.showCheckedOutBranch = false;
      expect(vm.runInContext('getOnRepoLoadShowCheckedOutBranch(0)', ctx)).toBe(false);
    });

    it('should return true when Enabled (1)', () => {
      expect(vm.runInContext('getOnRepoLoadShowCheckedOutBranch(1)', ctx)).toBe(true);
    });

    it('should return false when Disabled (2)', () => {
      expect(vm.runInContext('getOnRepoLoadShowCheckedOutBranch(2)', ctx)).toBe(false);
    });
  });

  describe('getOnRepoLoadShowSpecificBranches', () => {
    it('should return config value when repo value is null', () => {
      sandbox.initialState.config.onRepoLoad.showSpecificBranches = ['main', 'develop'];
      const result = vm.runInContext('getOnRepoLoadShowSpecificBranches(null)', ctx);
      expect(result).toEqual(['main', 'develop']);
    });

    it('should return the repo array when it is non-null', () => {
      sandbox.initialState.config.onRepoLoad.showSpecificBranches = ['main'];
      const result = vm.runInContext(
        'getOnRepoLoadShowSpecificBranches(["feature-a", "feature-b"])',
        ctx
      );
      expect(result).toEqual(['feature-a', 'feature-b']);
    });

    it('should return empty config array when repo value is null and config is empty', () => {
      sandbox.initialState.config.onRepoLoad.showSpecificBranches = [];
      const result = vm.runInContext('getOnRepoLoadShowSpecificBranches(null)', ctx);
      expect(result).toEqual([]);
    });
  });
});
