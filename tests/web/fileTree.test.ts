// @vitest-environment jsdom
import * as vm from 'vm';
import { createWebContext, loadWebFiles } from './webviewTestHelper';

describe('fileTree', () => {
  let ctx: vm.Context;
  let sandbox: Record<string, any>;

  beforeEach(() => {
    const webCtx = createWebContext();
    ctx = webCtx.ctx;
    sandbox = webCtx.sandbox;
    sandbox.GG.GitFileStatus = {
      Added: 'A',
      Modified: 'M',
      Deleted: 'D',
      Renamed: 'R',
      Untracked: 'U'
    };
    vm.runInContext('var CLASS_CONTEXT_MENU_ACTIVE = "contextMenuActive";', ctx);
    loadWebFiles(ctx, ['utils.ts', 'fileTree.ts']);
  });

  describe('sortFolderKeys', () => {
    it('should return folders before files', () => {
      const result = vm.runInContext(
        `
				var folder = { type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: true };
				folder.contents['bFile.ts'] = { type: 'file', name: 'bFile.ts', index: 0, reviewed: true };
				folder.contents['aFolder'] = { type: 'folder', name: 'aFolder', folderPath: 'aFolder', contents: {}, open: true, reviewed: true };
				sortFolderKeys(folder);
			`,
        ctx
      );
      expect(result).toEqual(['aFolder', 'bFile.ts']);
    });

    it('should sort alphabetically within folders and files', () => {
      const result = vm.runInContext(
        `
				var folder2 = { type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: true };
				folder2.contents['zFolder'] = { type: 'folder', name: 'zFolder', folderPath: 'zFolder', contents: {}, open: true, reviewed: true };
				folder2.contents['aFolder'] = { type: 'folder', name: 'aFolder', folderPath: 'aFolder', contents: {}, open: true, reviewed: true };
				folder2.contents['zFile.ts'] = { type: 'file', name: 'zFile.ts', index: 0, reviewed: true };
				folder2.contents['aFile.ts'] = { type: 'file', name: 'aFile.ts', index: 1, reviewed: true };
				sortFolderKeys(folder2);
			`,
        ctx
      );
      expect(result).toEqual(['aFolder', 'zFolder', 'aFile.ts', 'zFile.ts']);
    });

    it('should return empty array for empty folder', () => {
      const result = vm.runInContext(
        `
				sortFolderKeys({ type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: true });
			`,
        ctx
      );
      expect(result).toEqual([]);
    });
  });

  describe('getChildByPathSegment', () => {
    it('should return a direct child by name', () => {
      const result = vm.runInContext(
        `
				var gcFolder = { type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: true };
				gcFolder.contents['file.ts'] = { type: 'file', name: 'file.ts', index: 0, reviewed: true };
				getChildByPathSegment(gcFolder, 'file.ts');
			`,
        ctx
      );
      expect(result).toEqual({ type: 'file', name: 'file.ts', index: 0, reviewed: true });
    });

    it('should traverse nested path segments', () => {
      const result = vm.runInContext(
        `
				var gcFolder2 = { type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: true };
				gcFolder2.contents['src'] = { type: 'folder', name: 'src', folderPath: 'src', contents: {}, open: true, reviewed: true };
				gcFolder2.contents['src'].contents['lib'] = { type: 'folder', name: 'lib', folderPath: 'src/lib', contents: {}, open: true, reviewed: true };
				gcFolder2.contents['src'].contents['lib'].contents['deep.ts'] = { type: 'file', name: 'deep.ts', index: 2, reviewed: false };
				getChildByPathSegment(gcFolder2, 'src/lib/deep.ts');
			`,
        ctx
      );
      expect(result).toEqual({ type: 'file', name: 'deep.ts', index: 2, reviewed: false });
    });
  });

  describe('getFilesInTree', () => {
    it('should return empty array for empty folder', () => {
      const result = vm.runInContext(
        `
				getFilesInTree({ type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: true }, []);
			`,
        ctx
      );
      expect(result).toEqual([]);
    });

    it('should return newFilePath for files in nested folders', () => {
      const result = vm.runInContext(
        `
				var gfFolder = { type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: true };
				gfFolder.contents['src'] = { type: 'folder', name: 'src', folderPath: 'src', contents: {}, open: true, reviewed: true };
				gfFolder.contents['src'].contents['a.ts'] = { type: 'file', name: 'a.ts', index: 0, reviewed: true };
				gfFolder.contents['b.ts'] = { type: 'file', name: 'b.ts', index: 1, reviewed: true };
				var gfFiles = [
					{ oldFilePath: 'src/a.ts', newFilePath: 'src/a.ts', type: 'M', additions: 1, deletions: 0 },
					{ oldFilePath: 'b.ts', newFilePath: 'b.ts', type: 'A', additions: 5, deletions: 0 }
				];
				getFilesInTree(gfFolder, gfFiles);
			`,
        ctx
      );
      expect(result).toEqual(['src/a.ts', 'b.ts']);
    });

    it('should skip repo nodes', () => {
      const result = vm.runInContext(
        `
				var gfFolder2 = { type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: true };
				gfFolder2.contents['myRepo'] = { type: 'repo', name: 'myRepo', path: '/path/to/repo' };
				gfFolder2.contents['file.ts'] = { type: 'file', name: 'file.ts', index: 0, reviewed: true };
				var gfFiles2 = [{ oldFilePath: 'file.ts', newFilePath: 'file.ts', type: 'A', additions: 1, deletions: 0 }];
				getFilesInTree(gfFolder2, gfFiles2);
			`,
        ctx
      );
      expect(result).toEqual(['file.ts']);
    });
  });

  describe('setFileTreeReviewed', () => {
    it('should mark all files and folders as reviewed', () => {
      vm.runInContext(
        `
				var srFolder = { type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: false };
				srFolder.contents['a.ts'] = { type: 'file', name: 'a.ts', index: 0, reviewed: false };
				srFolder.contents['sub'] = { type: 'folder', name: 'sub', folderPath: 'sub', contents: {}, open: true, reviewed: false };
				srFolder.contents['sub'].contents['b.ts'] = { type: 'file', name: 'b.ts', index: 1, reviewed: false };
				setFileTreeReviewed(srFolder, true);
			`,
        ctx
      );
      expect(vm.runInContext('srFolder.reviewed', ctx)).toBe(true);
      expect(vm.runInContext('srFolder.contents["a.ts"].reviewed', ctx)).toBe(true);
      expect(vm.runInContext('srFolder.contents["sub"].reviewed', ctx)).toBe(true);
      expect(vm.runInContext('srFolder.contents["sub"].contents["b.ts"].reviewed', ctx)).toBe(true);
    });

    it('should mark all files and folders as not reviewed', () => {
      vm.runInContext(
        `
				var srFolder2 = { type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: true };
				srFolder2.contents['a.ts'] = { type: 'file', name: 'a.ts', index: 0, reviewed: true };
				srFolder2.contents['sub'] = { type: 'folder', name: 'sub', folderPath: 'sub', contents: {}, open: true, reviewed: true };
				srFolder2.contents['sub'].contents['b.ts'] = { type: 'file', name: 'b.ts', index: 1, reviewed: true };
				setFileTreeReviewed(srFolder2, false);
			`,
        ctx
      );
      expect(vm.runInContext('srFolder2.reviewed', ctx)).toBe(false);
      expect(vm.runInContext('srFolder2.contents["a.ts"].reviewed', ctx)).toBe(false);
      expect(vm.runInContext('srFolder2.contents["sub"].reviewed', ctx)).toBe(false);
      expect(vm.runInContext('srFolder2.contents["sub"].contents["b.ts"].reviewed', ctx)).toBe(
        false
      );
    });

    it('should not modify repo nodes', () => {
      vm.runInContext(
        `
				var srFolder3 = { type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: false };
				srFolder3.contents['myRepo'] = { type: 'repo', name: 'myRepo', path: '/path' };
				setFileTreeReviewed(srFolder3, true);
			`,
        ctx
      );
      expect(vm.runInContext('srFolder3.reviewed', ctx)).toBe(true);
      expect(vm.runInContext('srFolder3.contents["myRepo"].reviewed', ctx)).toBeUndefined();
    });
  });

  describe('alterFileTreeFileReviewed', () => {
    it('should set reviewed for a specific file', () => {
      vm.runInContext(
        `
				var afFolder = { type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: true };
				afFolder.contents['a.ts'] = { type: 'file', name: 'a.ts', index: 0, reviewed: true };
				afFolder.contents['b.ts'] = { type: 'file', name: 'b.ts', index: 1, reviewed: true };
				alterFileTreeFileReviewed(afFolder, 'a.ts', false);
			`,
        ctx
      );
      expect(vm.runInContext('afFolder.contents["a.ts"].reviewed', ctx)).toBe(false);
      expect(vm.runInContext('afFolder.contents["b.ts"].reviewed', ctx)).toBe(true);
    });

    it('should recalculate parent folder reviewed status to false when child is unreviewed', () => {
      vm.runInContext(
        `
				var afFolder2 = { type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: true };
				afFolder2.contents['src'] = { type: 'folder', name: 'src', folderPath: 'src', contents: {}, open: true, reviewed: true };
				afFolder2.contents['src'].contents['file.ts'] = { type: 'file', name: 'file.ts', index: 0, reviewed: true };
				alterFileTreeFileReviewed(afFolder2, 'src/file.ts', false);
			`,
        ctx
      );
      expect(vm.runInContext('afFolder2.contents["src"].contents["file.ts"].reviewed', ctx)).toBe(
        false
      );
      expect(vm.runInContext('afFolder2.contents["src"].reviewed', ctx)).toBe(false);
      expect(vm.runInContext('afFolder2.reviewed', ctx)).toBe(false);
    });

    it('should recalculate parent folder reviewed status to true when all children are reviewed', () => {
      vm.runInContext(
        `
				var afFolder3 = { type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: false };
				afFolder3.contents['src'] = { type: 'folder', name: 'src', folderPath: 'src', contents: {}, open: true, reviewed: false };
				afFolder3.contents['src'].contents['file.ts'] = { type: 'file', name: 'file.ts', index: 0, reviewed: false };
				alterFileTreeFileReviewed(afFolder3, 'src/file.ts', true);
			`,
        ctx
      );
      expect(vm.runInContext('afFolder3.contents["src"].contents["file.ts"].reviewed', ctx)).toBe(
        true
      );
      expect(vm.runInContext('afFolder3.contents["src"].reviewed', ctx)).toBe(true);
      expect(vm.runInContext('afFolder3.reviewed', ctx)).toBe(true);
    });

    it('should handle invalid file path gracefully', () => {
      vm.runInContext(
        `
				var afFolder4 = { type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: true };
				afFolder4.contents['a.ts'] = { type: 'file', name: 'a.ts', index: 0, reviewed: true };
				alterFileTreeFileReviewed(afFolder4, 'nonexistent.ts', false);
			`,
        ctx
      );
      expect(vm.runInContext('afFolder4.reviewed', ctx)).toBe(true);
      expect(vm.runInContext('afFolder4.contents["a.ts"].reviewed', ctx)).toBe(true);
    });
  });

  describe('alterFileTreeFolderOpen', () => {
    it('should set folder open state to false', () => {
      vm.runInContext(
        `
				var aoFolder = { type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: true };
				aoFolder.contents['src'] = { type: 'folder', name: 'src', folderPath: 'src', contents: {}, open: true, reviewed: true };
				alterFileTreeFolderOpen(aoFolder, 'src', false);
			`,
        ctx
      );
      expect(vm.runInContext('aoFolder.contents["src"].open', ctx)).toBe(false);
    });

    it('should set folder open state to true', () => {
      vm.runInContext(
        `
				var aoFolder2 = { type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: true };
				aoFolder2.contents['src'] = { type: 'folder', name: 'src', folderPath: 'src', contents: {}, open: false, reviewed: true };
				alterFileTreeFolderOpen(aoFolder2, 'src', true);
			`,
        ctx
      );
      expect(vm.runInContext('aoFolder2.contents["src"].open', ctx)).toBe(true);
    });

    it('should handle invalid folder path gracefully', () => {
      vm.runInContext(
        `
				var aoFolder3 = { type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: true };
				aoFolder3.contents['src'] = { type: 'folder', name: 'src', folderPath: 'src', contents: {}, open: true, reviewed: true };
				alterFileTreeFolderOpen(aoFolder3, 'nonexistent', false);
			`,
        ctx
      );
      expect(vm.runInContext('aoFolder3.contents["src"].open', ctx)).toBe(true);
    });
  });

  describe('calcFileTreeFoldersReviewed', () => {
    it('should set folder reviewed to true when all children are reviewed', () => {
      vm.runInContext(
        `
				var cfFolder = { type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: false };
				cfFolder.contents['a.ts'] = { type: 'file', name: 'a.ts', index: 0, reviewed: true };
				cfFolder.contents['b.ts'] = { type: 'file', name: 'b.ts', index: 1, reviewed: true };
				calcFileTreeFoldersReviewed(cfFolder);
			`,
        ctx
      );
      expect(vm.runInContext('cfFolder.reviewed', ctx)).toBe(true);
    });

    it('should set folder reviewed to false when some children are not reviewed', () => {
      vm.runInContext(
        `
				var cfFolder2 = { type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: true };
				cfFolder2.contents['a.ts'] = { type: 'file', name: 'a.ts', index: 0, reviewed: true };
				cfFolder2.contents['b.ts'] = { type: 'file', name: 'b.ts', index: 1, reviewed: false };
				calcFileTreeFoldersReviewed(cfFolder2);
			`,
        ctx
      );
      expect(vm.runInContext('cfFolder2.reviewed', ctx)).toBe(false);
    });

    it('should handle nested folders recursively', () => {
      vm.runInContext(
        `
				var cfFolder3 = { type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: true };
				cfFolder3.contents['src'] = { type: 'folder', name: 'src', folderPath: 'src', contents: {}, open: true, reviewed: true };
				cfFolder3.contents['src'].contents['file.ts'] = { type: 'file', name: 'file.ts', index: 0, reviewed: false };
				calcFileTreeFoldersReviewed(cfFolder3);
			`,
        ctx
      );
      expect(vm.runInContext('cfFolder3.contents["src"].reviewed', ctx)).toBe(false);
      expect(vm.runInContext('cfFolder3.reviewed', ctx)).toBe(false);
    });

    it('should set folder reviewed to true when nested folders are all reviewed', () => {
      vm.runInContext(
        `
				var cfFolder4 = { type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: false };
				cfFolder4.contents['src'] = { type: 'folder', name: 'src', folderPath: 'src', contents: {}, open: true, reviewed: false };
				cfFolder4.contents['src'].contents['file.ts'] = { type: 'file', name: 'file.ts', index: 0, reviewed: true };
				calcFileTreeFoldersReviewed(cfFolder4);
			`,
        ctx
      );
      expect(vm.runInContext('cfFolder4.contents["src"].reviewed', ctx)).toBe(true);
      expect(vm.runInContext('cfFolder4.reviewed', ctx)).toBe(true);
    });
  });

  describe('getCurrentFolderInfo', () => {
    it('should return the same folder when it has multiple children', () => {
      const result = vm.runInContext(
        `
				var ciFolder = { type: 'folder', name: 'src', folderPath: 'src', contents: {}, open: true, reviewed: true };
				ciFolder.contents['a.ts'] = { type: 'file', name: 'a.ts', index: 0, reviewed: true };
				ciFolder.contents['b.ts'] = { type: 'file', name: 'b.ts', index: 1, reviewed: true };
				var result = getCurrentFolderInfo(ciFolder, 'src', 'src');
				({ name: result.name, pathSeg: result.pathSeg, folderPath: result.folder.folderPath });
			`,
        ctx
      );
      expect(result.name).toBe('src');
      expect(result.pathSeg).toBe('src');
      expect(result.folderPath).toBe('src');
    });

    it('should compact single-child folder chain', () => {
      const result = vm.runInContext(
        `
				var ciFolder2 = { type: 'folder', name: 'src', folderPath: 'src', contents: {}, open: true, reviewed: true };
				ciFolder2.contents['lib'] = { type: 'folder', name: 'lib', folderPath: 'src/lib', contents: {}, open: true, reviewed: true };
				ciFolder2.contents['lib'].contents['a.ts'] = { type: 'file', name: 'a.ts', index: 0, reviewed: true };
				ciFolder2.contents['lib'].contents['b.ts'] = { type: 'file', name: 'b.ts', index: 1, reviewed: true };
				var result2 = getCurrentFolderInfo(ciFolder2, 'src', 'src');
				({ name: result2.name, pathSeg: result2.pathSeg, folderPath: result2.folder.folderPath });
			`,
        ctx
      );
      expect(result.name).toBe('src / lib');
      expect(result.pathSeg).toBe('src/lib');
      expect(result.folderPath).toBe('src/lib');
    });

    it('should compact multi-level single-child chain', () => {
      const result = vm.runInContext(
        `
				var ciFolder3 = { type: 'folder', name: 'src', folderPath: 'src', contents: {}, open: true, reviewed: true };
				ciFolder3.contents['lib'] = { type: 'folder', name: 'lib', folderPath: 'src/lib', contents: {}, open: true, reviewed: true };
				ciFolder3.contents['lib'].contents['core'] = { type: 'folder', name: 'core', folderPath: 'src/lib/core', contents: {}, open: true, reviewed: true };
				ciFolder3.contents['lib'].contents['core'].contents['a.ts'] = { type: 'file', name: 'a.ts', index: 0, reviewed: true };
				var result3 = getCurrentFolderInfo(ciFolder3, 'src', 'src');
				({ name: result3.name, pathSeg: result3.pathSeg, folderPath: result3.folder.folderPath });
			`,
        ctx
      );
      expect(result.name).toBe('src / lib / core');
      expect(result.pathSeg).toBe('src/lib/core');
      expect(result.folderPath).toBe('src/lib/core');
    });

    it('should not compact when single child is a file', () => {
      const result = vm.runInContext(
        `
				var ciFolder4 = { type: 'folder', name: 'src', folderPath: 'src', contents: {}, open: true, reviewed: true };
				ciFolder4.contents['only.ts'] = { type: 'file', name: 'only.ts', index: 0, reviewed: true };
				var result4 = getCurrentFolderInfo(ciFolder4, 'src', 'src');
				({ name: result4.name, pathSeg: result4.pathSeg, folderPath: result4.folder.folderPath });
			`,
        ctx
      );
      expect(result.name).toBe('src');
      expect(result.pathSeg).toBe('src');
      expect(result.folderPath).toBe('src');
    });
  });

  describe('createFileTree', () => {
    it('should create empty tree for empty file list', () => {
      const result = vm.runInContext("createFileTree('/repo', {}, [], null)", ctx);
      expect(result.type).toBe('folder');
      expect(result.contents).toEqual({});
    });

    it('should create tree with files', () => {
      const result = vm.runInContext(
        `
				var files = [
					{ oldFilePath: 'src/a.ts', newFilePath: 'src/a.ts', type: 'M', additions: 1, deletions: 0 },
					{ oldFilePath: 'b.ts', newFilePath: 'b.ts', type: 'A', additions: 5, deletions: 0 }
				];
				createFileTree('/repo', {}, files, null);
			`,
        ctx
      );
      expect(result.contents['src'].type).toBe('folder');
      expect(result.contents['src'].contents['a.ts'].type).toBe('file');
      expect(result.contents['src'].contents['a.ts'].index).toBe(0);
      expect(result.contents['b.ts'].type).toBe('file');
      expect(result.contents['b.ts'].index).toBe(1);
    });

    it('should mark files as reviewed when no code review', () => {
      const result = vm.runInContext(
        `
				var files2 = [{ oldFilePath: 'a.ts', newFilePath: 'a.ts', type: 'M', additions: 1, deletions: 0 }];
				createFileTree('/repo', {}, files2, null);
			`,
        ctx
      );
      expect(result.contents['a.ts'].reviewed).toBe(true);
    });

    it('should mark files as unreviewed when in code review remaining files', () => {
      const result = vm.runInContext(
        `
				var files3 = [{ oldFilePath: 'a.ts', newFilePath: 'a.ts', type: 'M', additions: 1, deletions: 0 }];
				createFileTree('/repo', {}, files3, { remainingFiles: ['a.ts'] });
			`,
        ctx
      );
      expect(result.contents['a.ts'].reviewed).toBe(false);
    });

    it('should detect nested repos', () => {
      const result = vm.runInContext(
        `
				var files4 = [{ oldFilePath: 'sub/file.ts', newFilePath: 'sub/file.ts', type: 'A', additions: 1, deletions: 0 }];
				createFileTree('/repo', { '/repo/sub': {} }, files4, null);
			`,
        ctx
      );
      expect(result.contents['sub'].type).toBe('repo');
      expect(result.contents['sub'].path).toBe('/repo/sub');
    });

    it('should skip empty path segments', () => {
      const result = vm.runInContext(
        `
				var files5 = [{ oldFilePath: '', newFilePath: '', type: 'A', additions: 1, deletions: 0 }];
				createFileTree('/repo', {}, files5, null);
			`,
        ctx
      );
      expect(Object.keys(result.contents).length).toBe(0);
    });

    it('should set correct folderPath for nested folders', () => {
      const result = vm.runInContext(
        `
				var files6 = [{ oldFilePath: 'src/lib/file.ts', newFilePath: 'src/lib/file.ts', type: 'M', additions: 1, deletions: 0 }];
				createFileTree('/repo', {}, files6, null);
			`,
        ctx
      );
      expect(result.contents['src'].folderPath).toBe('src');
      expect(result.contents['src'].contents['lib'].folderPath).toBe('src/lib');
    });
  });

  describe('generateFileViewHtml', () => {
    it('should return HTML string for tree view type', () => {
      const result = vm.runInContext(
        `
				var gvFolder = { type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: true };
				gvFolder.contents['file.ts'] = { type: 'file', name: 'file.ts', index: 0, reviewed: true };
				var gvFiles = [{ oldFilePath: 'file.ts', newFilePath: 'file.ts', type: 'A', additions: 1, deletions: 0 }];
				generateFileViewHtml(gvFolder, gvFiles, null, -1, GG.FileViewType.Tree, false);
			`,
        ctx
      );
      expect(typeof result).toBe('string');
      expect(result).toContain('fileTreeFolderContents');
    });

    it('should return HTML string for list view type', () => {
      const result = vm.runInContext(
        `
				var gvFolder2 = { type: 'folder', name: 'root', folderPath: '', contents: {}, open: true, reviewed: true };
				gvFolder2.contents['file.ts'] = { type: 'file', name: 'file.ts', index: 0, reviewed: true };
				var gvFiles2 = [{ oldFilePath: 'file.ts', newFilePath: 'file.ts', type: 'M', additions: 3, deletions: 1 }];
				generateFileViewHtml(gvFolder2, gvFiles2, null, -1, GG.FileViewType.List, false);
			`,
        ctx
      );
      expect(typeof result).toBe('string');
      expect(result).toContain('fileTreeFolderContents');
    });
  });
});
