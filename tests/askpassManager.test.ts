import * as vscode from './mocks/vscode';

import * as http from 'http';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

vi.mock('http');
vi.mock('fs');

const { mockGetNonce } = vi.hoisted(() => ({
  mockGetNonce: vi.fn()
}));
vi.mock('../src/utils', () => ({
  getNonce: mockGetNonce
}));

import { AskpassManager } from '../src/askpass/askpassManager';

const mockedHttp = vi.mocked(http);
const mockedFs = vi.mocked(fs);

let mockServer: {
  listen: Mock;
  on: Mock;
  close: Mock;
};

beforeEach(() => {
  mockServer = {
    listen: vi.fn(),
    on: vi.fn(),
    close: vi.fn()
  };
  mockedHttp.createServer.mockReturnValue(mockServer as any);
  mockedFs.chmod.mockImplementation((_path: any, _mode: any, callback: any) => {
    callback(null);
  });
  mockedFs.unlinkSync.mockImplementation(() => {});
  mockGetNonce.mockReturnValue('test-nonce');
});

describe('AskpassManager', () => {
  describe('Constructor', () => {
    it('Should create a server and chmod both askpass scripts', () => {
      const manager = new AskpassManager();

      expect(mockedHttp.createServer).toHaveBeenCalledTimes(1);
      expect(mockServer.listen).toHaveBeenCalledTimes(1);
      expect(mockServer.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockedFs.chmod).toHaveBeenCalledTimes(2);
      expect(mockedFs.chmod).toHaveBeenCalledWith(
        expect.stringContaining('askpass.sh'),
        '755',
        expect.any(Function)
      );
      expect(mockedFs.chmod).toHaveBeenCalledWith(
        expect.stringContaining('askpass-empty.sh'),
        '755',
        expect.any(Function)
      );
      expect(manager['enabled']).toBe(true);
      manager.dispose();
    });

    it('Should set enabled to false when listen throws', () => {
      mockServer.listen.mockImplementation(() => {
        throw new Error('listen failed');
      });

      const manager = new AskpassManager();

      expect(manager['enabled']).toBe(false);
      manager.dispose();
    });
  });

  describe('getEnv()', () => {
    it('Should return full environment when enabled', () => {
      const manager = new AskpassManager();
      const env = manager.getEnv();

      expect(env.ELECTRON_RUN_AS_NODE).toBe('1');
      expect(env.GIT_ASKPASS).toContain('askpass.sh');
      expect(env.VSCODE_GIT_GRAPH_ASKPASS_NODE).toBe(process.execPath);
      expect(env.VSCODE_GIT_GRAPH_ASKPASS_MAIN).toContain('askpassMain.js');
      expect(env.VSCODE_GIT_GRAPH_ASKPASS_HANDLE).toBeDefined();

      manager.dispose();
    });

    it('Should return only GIT_ASKPASS pointing to askpass-empty.sh when disabled', () => {
      mockServer.listen.mockImplementation(() => {
        throw new Error('fail');
      });

      const manager = new AskpassManager();
      const env = manager.getEnv();

      expect(env.GIT_ASKPASS).toContain('askpass-empty.sh');
      expect(env.ELECTRON_RUN_AS_NODE).toBeUndefined();
      expect(env.VSCODE_GIT_GRAPH_ASKPASS_NODE).toBeUndefined();
      expect(env.VSCODE_GIT_GRAPH_ASKPASS_MAIN).toBeUndefined();
      expect(env.VSCODE_GIT_GRAPH_ASKPASS_HANDLE).toBeUndefined();

      manager.dispose();
    });
  });

  describe('getIPCHandlePath (indirect via getEnv)', () => {
    it('Should use pipe path on win32', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const manager = new AskpassManager();
      const env = manager.getEnv();

      expect(env.VSCODE_GIT_GRAPH_ASKPASS_HANDLE).toMatch(/^\\\\.\\pipe\\git-graph-askpass-/);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
      manager.dispose();
    });

    it('Should use XDG_RUNTIME_DIR when set', () => {
      const originalPlatform = process.platform;
      const originalXdg = process.env['XDG_RUNTIME_DIR'];
      Object.defineProperty(process, 'platform', { value: 'linux' });
      process.env['XDG_RUNTIME_DIR'] = '/run/user/1000';

      const manager = new AskpassManager();
      const env = manager.getEnv();

      expect(env.VSCODE_GIT_GRAPH_ASKPASS_HANDLE).toBe(
        path.join('/run/user/1000', 'git-graph-askpass-test-nonce.sock')
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform });
      if (originalXdg !== undefined) {
        process.env['XDG_RUNTIME_DIR'] = originalXdg;
      } else {
        delete process.env['XDG_RUNTIME_DIR'];
      }
      manager.dispose();
    });

    it('Should fallback to tmpdir when XDG_RUNTIME_DIR is not set', () => {
      const originalPlatform = process.platform;
      const originalXdg = process.env['XDG_RUNTIME_DIR'];
      Object.defineProperty(process, 'platform', { value: 'linux' });
      delete process.env['XDG_RUNTIME_DIR'];

      const manager = new AskpassManager();
      const env = manager.getEnv();

      expect(env.VSCODE_GIT_GRAPH_ASKPASS_HANDLE).toBe(
        path.join(os.tmpdir(), 'git-graph-askpass-test-nonce.sock')
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform });
      if (originalXdg !== undefined) {
        process.env['XDG_RUNTIME_DIR'] = originalXdg;
      } else {
        delete process.env['XDG_RUNTIME_DIR'];
      }
      manager.dispose();
    });
  });

  describe('dispose', () => {
    it('Should close the server', () => {
      const manager = new AskpassManager();
      manager.dispose();

      expect(mockServer.close).toHaveBeenCalledTimes(1);
    });

    it('Should call unlinkSync on non-win32', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });

      const manager = new AskpassManager();
      manager.dispose();

      expect(mockedFs.unlinkSync).toHaveBeenCalledTimes(1);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('Should not call unlinkSync on win32', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const manager = new AskpassManager();
      manager.dispose();

      expect(mockedFs.unlinkSync).not.toHaveBeenCalled();

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('onRequest', () => {
    it('Should handle a request and show input box', async () => {
      const requestHandler = vi.fn();
      mockedHttp.createServer.mockImplementation((handler: any) => {
        requestHandler.mockImplementation(handler);
        return mockServer as any;
      });

      (vscode.window as any).showInputBox = vi.fn().mockResolvedValue('mypassword');

      const manager = new AskpassManager();

      const mockReq: any = {
        setEncoding: vi.fn(),
        on: vi.fn()
      };
      const mockRes: any = {
        writeHead: vi.fn(),
        end: vi.fn()
      };

      requestHandler(mockReq, mockRes);

      const dataCallback = mockReq.on.mock.calls.find((c: any[]) => c[0] === 'data')[1];
      const endCallback = mockReq.on.mock.calls.find((c: any[]) => c[0] === 'end')[1];

      dataCallback(
        JSON.stringify({ host: 'github.com', request: 'Password for https://github.com' })
      );

      await endCallback();

      expect(vscode.window.showInputBox).toHaveBeenCalledWith({
        placeHolder: 'Password for https://github.com',
        prompt: 'Git Graph: github.com',
        password: true,
        ignoreFocusOut: true
      });
      expect(mockRes.writeHead).toHaveBeenCalledWith(200);
      expect(mockRes.end).toHaveBeenCalledWith(JSON.stringify('mypassword'));

      manager.dispose();
    });

    it('Should respond with 500 when input box is rejected', async () => {
      const requestHandler = vi.fn();
      mockedHttp.createServer.mockImplementation((handler: any) => {
        requestHandler.mockImplementation(handler);
        return mockServer as any;
      });

      (vscode.window as any).showInputBox = vi.fn().mockRejectedValue(new Error('dismissed'));

      const manager = new AskpassManager();

      const mockReq: any = {
        setEncoding: vi.fn(),
        on: vi.fn()
      };
      const mockRes: any = {
        writeHead: vi.fn(),
        end: vi.fn()
      };

      requestHandler(mockReq, mockRes);

      const dataCallback = mockReq.on.mock.calls.find((c: any[]) => c[0] === 'data')[1];
      const endCallback = mockReq.on.mock.calls.find((c: any[]) => c[0] === 'end')[1];

      dataCallback(JSON.stringify({ host: 'github.com', request: 'Username' }));

      await endCallback();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockRes.writeHead).toHaveBeenCalledWith(500);

      manager.dispose();
    });
  });
});
