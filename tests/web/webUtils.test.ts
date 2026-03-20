// @vitest-environment jsdom
import * as vm from 'vm';
import { createRepoState, createWebContext, loadWebFiles } from './webviewTestHelper';

describe('web/utils', () => {
  let ctx: vm.Context;

  beforeEach(() => {
    const webCtx = createWebContext();
    ctx = webCtx.ctx;
    loadWebFiles(ctx, ['utils.ts']);
  });

  describe('arraysEqual', () => {
    it('should return true for identical arrays', () => {
      const result = vm.runInContext('arraysEqual([1,2,3], [1,2,3], (a,b) => a === b)', ctx);
      expect(result).toBe(true);
    });

    it('should return false for different lengths', () => {
      const result = vm.runInContext('arraysEqual([1,2], [1,2,3], (a,b) => a === b)', ctx);
      expect(result).toBe(false);
    });

    it('should return false for different elements', () => {
      const result = vm.runInContext('arraysEqual([1,2,3], [1,2,4], (a,b) => a === b)', ctx);
      expect(result).toBe(false);
    });

    it('should return true for empty arrays', () => {
      const result = vm.runInContext('arraysEqual([], [], (a,b) => a === b)', ctx);
      expect(result).toBe(true);
    });

    it('should use custom comparator', () => {
      const result = vm.runInContext(
        'arraysEqual([{x:1},{x:2}], [{x:1},{x:2}], (a,b) => a.x === b.x)',
        ctx
      );
      expect(result).toBe(true);
    });
  });

  describe('arraysStrictlyEqual', () => {
    it('should return true for identical arrays', () => {
      const result = vm.runInContext('arraysStrictlyEqual(["a","b"], ["a","b"])', ctx);
      expect(result).toBe(true);
    });

    it('should return false for different arrays', () => {
      const result = vm.runInContext('arraysStrictlyEqual(["a","b"], ["a","c"])', ctx);
      expect(result).toBe(false);
    });

    it('should return false for different lengths', () => {
      const result = vm.runInContext('arraysStrictlyEqual([1], [1,2])', ctx);
      expect(result).toBe(false);
    });

    it('should return true for empty arrays', () => {
      const result = vm.runInContext('arraysStrictlyEqual([], [])', ctx);
      expect(result).toBe(true);
    });
  });

  describe('arraysStrictlyEqualIgnoringOrder', () => {
    it('should return true for same elements in different order', () => {
      const result = vm.runInContext('arraysStrictlyEqualIgnoringOrder([3,1,2], [1,2,3])', ctx);
      expect(result).toBe(true);
    });

    it('should return false for different elements', () => {
      const result = vm.runInContext('arraysStrictlyEqualIgnoringOrder([1,2,3], [1,2,4])', ctx);
      expect(result).toBe(false);
    });

    it('should return false for different lengths', () => {
      const result = vm.runInContext('arraysStrictlyEqualIgnoringOrder([1,2], [1,2,3])', ctx);
      expect(result).toBe(false);
    });

    it('should return true for empty arrays', () => {
      const result = vm.runInContext('arraysStrictlyEqualIgnoringOrder([], [])', ctx);
      expect(result).toBe(true);
    });
  });

  describe('modifyColourOpacity', () => {
    it('should handle RGBA input', () => {
      const result = vm.runInContext('modifyColourOpacity("rgba(255, 0, 128, 1)", 0.5)', ctx);
      expect(result).toBe('rgba(255,0,128,0.50)');
    });

    it('should handle HEX 6-digit input', () => {
      const result = vm.runInContext('modifyColourOpacity("#ff0080", 0.5)', ctx);
      expect(result).toBe('rgba(255,0,128,0.50)');
    });

    it('should handle HEX 3-digit input', () => {
      const result = vm.runInContext('modifyColourOpacity("#f08", 0.5)', ctx);
      expect(result).toBe('rgba(255,0,136,0.50)');
    });

    it('should handle HEX 8-digit input with alpha', () => {
      const result = vm.runInContext('modifyColourOpacity("#ff008080", 0.5)', ctx);
      expect(result).toBe('rgba(255,0,128,0.25)');
    });

    it('should handle HEX 4-digit input with alpha', () => {
      const result = vm.runInContext('modifyColourOpacity("#f088", 0.5)', ctx);
      expect(result).toBe('rgba(255,0,136,0.27)');
    });

    it('should handle RGB input', () => {
      const result = vm.runInContext('modifyColourOpacity("rgb(100, 200, 50)", 0.75)', ctx);
      expect(result).toBe('rgba(100,200,50,0.75)');
    });

    it('should return transparent black for invalid colour', () => {
      const result = vm.runInContext('modifyColourOpacity("invalid", 0.5)', ctx);
      expect(result).toBe('rgba(0,0,0,0)');
    });

    it('should handle full opacity', () => {
      const result = vm.runInContext('modifyColourOpacity("#ffffff", 1.0)', ctx);
      expect(result).toBe('rgba(255,255,255,1.00)');
    });

    it('should handle zero opacity', () => {
      const result = vm.runInContext('modifyColourOpacity("rgba(255, 0, 0, 1)", 0)', ctx);
      expect(result).toBe('rgba(255,0,0,0.00)');
    });
  });

  describe('pad2', () => {
    it('should pad single digit numbers', () => {
      expect(vm.runInContext('pad2(0)', ctx)).toBe('00');
      expect(vm.runInContext('pad2(1)', ctx)).toBe('01');
      expect(vm.runInContext('pad2(9)', ctx)).toBe('09');
    });

    it('should not pad two digit numbers', () => {
      expect(vm.runInContext('pad2(10)', ctx)).toBe(10);
      expect(vm.runInContext('pad2(59)', ctx)).toBe(59);
      expect(vm.runInContext('pad2(99)', ctx)).toBe(99);
    });
  });

  describe('getRepoName', () => {
    it('should return last path segment', () => {
      const result = vm.runInContext('getRepoName("/home/user/project")', ctx);
      expect(result).toBe('project');
    });

    it('should handle trailing slash', () => {
      const result = vm.runInContext('getRepoName("/home/user/project/")', ctx);
      expect(result).toBe('project');
    });

    it('should return path itself for root slash', () => {
      const result = vm.runInContext('getRepoName("C:/")', ctx);
      expect(result).toBe('C:/');
    });

    it('should return path itself when no slashes', () => {
      const result = vm.runInContext('getRepoName("project")', ctx);
      expect(result).toBe('project');
    });

    it('should handle deeply nested paths', () => {
      const result = vm.runInContext('getRepoName("/a/b/c/d/project")', ctx);
      expect(result).toBe('project');
    });
  });

  describe('getSortedRepositoryPaths', () => {
    it('should sort by FullPath (0)', () => {
      ctx.testRepos = {
        '/z/repo': createRepoState(),
        '/a/repo': createRepoState(),
        '/m/repo': createRepoState()
      };
      const result = vm.runInContext('getSortedRepositoryPaths(testRepos, 0)', ctx);
      expect(Array.from(result)).toEqual(['/a/repo', '/m/repo', '/z/repo']);
    });

    it('should sort by Name (1)', () => {
      ctx.testRepos = {
        '/path/zebra': createRepoState(),
        '/path/alpha': createRepoState(),
        '/path/middle': createRepoState()
      };
      const result = vm.runInContext('getSortedRepositoryPaths(testRepos, 1)', ctx);
      expect(Array.from(result)).toEqual(['/path/alpha', '/path/middle', '/path/zebra']);
    });

    it('should use custom name when sorting by Name (1)', () => {
      ctx.testRepos = {
        '/path/zebra': createRepoState({ name: 'AAA' }),
        '/path/alpha': createRepoState({ name: 'ZZZ' })
      };
      const result = vm.runInContext('getSortedRepositoryPaths(testRepos, 1)', ctx);
      expect(Array.from(result)).toEqual(['/path/zebra', '/path/alpha']);
    });

    it('should sort by WorkspaceFullPath (2)', () => {
      ctx.testRepos = {
        '/path/b': createRepoState({ workspaceFolderIndex: 1 }),
        '/path/a': createRepoState({ workspaceFolderIndex: 0 }),
        '/path/c': createRepoState({ workspaceFolderIndex: null })
      };
      const result = vm.runInContext('getSortedRepositoryPaths(testRepos, 2)', ctx);
      expect(Array.from(result)).toEqual(['/path/a', '/path/b', '/path/c']);
    });

    it('should sort repos with same workspace index by path', () => {
      ctx.testRepos = {
        '/path/z': createRepoState({ workspaceFolderIndex: 0 }),
        '/path/a': createRepoState({ workspaceFolderIndex: 0 })
      };
      const result = vm.runInContext('getSortedRepositoryPaths(testRepos, 2)', ctx);
      expect(Array.from(result)).toEqual(['/path/a', '/path/z']);
    });
  });

  describe('escapeHtml', () => {
    it('should escape special characters', () => {
      ctx.testInput = '<div>test & \'stuff" here</div>';
      const result = vm.runInContext('escapeHtml(testInput)', ctx);
      expect(result).toBe('&lt;div&gt;test &amp; &#x27;stuff&quot; here&lt;&#x2F;div&gt;');
    });

    it('should handle string with no special chars', () => {
      const result = vm.runInContext('escapeHtml("hello world")', ctx);
      expect(result).toBe('hello world');
    });

    it('should handle empty string', () => {
      const result = vm.runInContext('escapeHtml("")', ctx);
      expect(result).toBe('');
    });
  });

  describe('unescapeHtml', () => {
    it('should unescape HTML entities', () => {
      const result = vm.runInContext(
        'unescapeHtml("&lt;div&gt;test &amp; &#x27;stuff&quot; here&lt;&#x2F;div&gt;")',
        ctx
      );
      expect(result).toBe('<div>test & \'stuff" here</div>');
    });

    it('should handle string with no entities', () => {
      const result = vm.runInContext('unescapeHtml("hello world")', ctx);
      expect(result).toBe('hello world');
    });
  });

  describe('escapeHtml/unescapeHtml round-trip', () => {
    it('should round-trip correctly', () => {
      const testStr = '<a href="test">link & more \'quotes\'</a>';
      ctx.testStr = testStr;
      const result = vm.runInContext('unescapeHtml(escapeHtml(testStr))', ctx);
      expect(result).toBe(testStr);
    });
  });

  describe('constants', () => {
    it('should define UNCOMMITTED as "*"', () => {
      expect(vm.runInContext('UNCOMMITTED', ctx)).toBe('*');
    });

    it('should define SHOW_ALL_BRANCHES as ""', () => {
      expect(vm.runInContext('SHOW_ALL_BRANCHES', ctx)).toBe('');
    });

    it('should define COLUMN_HIDDEN as -100', () => {
      expect(vm.runInContext('COLUMN_HIDDEN', ctx)).toBe(-100);
    });

    it('should define COLUMN_AUTO as -101', () => {
      expect(vm.runInContext('COLUMN_AUTO', ctx)).toBe(-101);
    });
  });

  describe('formatCommaSeparatedList', () => {
    it('should format single item', () => {
      const result = vm.runInContext('formatCommaSeparatedList(["A"])', ctx);
      expect(result).toBe('A');
    });

    it('should format two items with ampersand', () => {
      const result = vm.runInContext('formatCommaSeparatedList(["A", "B"])', ctx);
      expect(result).toBe('A & B');
    });

    it('should format three items with commas and ampersand', () => {
      const result = vm.runInContext('formatCommaSeparatedList(["A", "B", "C"])', ctx);
      expect(result).toBe('A, B & C');
    });

    it('should handle empty list', () => {
      const result = vm.runInContext('formatCommaSeparatedList([])', ctx);
      expect(result).toBe('');
    });
  });

  describe('alterClass', () => {
    it('should add class when state is true', () => {
      const elem = document.createElement('div');
      ctx.testElem = elem;
      const result = vm.runInContext('alterClass(testElem, "active", true)', ctx);
      expect(result).toBe(true);
      expect(elem.classList.contains('active')).toBe(true);
    });

    it('should remove class when state is false', () => {
      const elem = document.createElement('div');
      elem.classList.add('active');
      ctx.testElem = elem;
      const result = vm.runInContext('alterClass(testElem, "active", false)', ctx);
      expect(result).toBe(true);
      expect(elem.classList.contains('active')).toBe(false);
    });

    it('should return false when no change needed (add already present)', () => {
      const elem = document.createElement('div');
      elem.classList.add('active');
      ctx.testElem = elem;
      const result = vm.runInContext('alterClass(testElem, "active", true)', ctx);
      expect(result).toBe(false);
    });

    it('should return false when no change needed (remove already absent)', () => {
      const elem = document.createElement('div');
      ctx.testElem = elem;
      const result = vm.runInContext('alterClass(testElem, "active", false)', ctx);
      expect(result).toBe(false);
    });
  });
});
