jest.mock('fs');
jest.mock('https');
jest.mock('crypto');

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import { generateNonce, getDataDirectory, getLifeCycleStateInDirectory, saveLifeCycleStateInDirectory, sendQueue, LifeCycleStage } from '../src/life-cycle/utils';

const mockedFs = jest.mocked(fs);
const mockedHttps = jest.mocked(https);
const mockedCrypto = jest.mocked(crypto);

describe('life-cycle/utils', () => {
	describe('generateNonce', () => {
		it('Should return a base64 encoded string from 32 random bytes', () => {
			const mockBuffer = Buffer.from('a'.repeat(32));
			mockedCrypto.randomBytes.mockReturnValue(mockBuffer as any);

			const result = generateNonce();

			expect(mockedCrypto.randomBytes).toHaveBeenCalledWith(32);
			expect(result).toBe(mockBuffer.toString('base64'));
		});
	});

	describe('getDataDirectory', () => {
		it('Should return path.join(__dirname, "data")', () => {
			const result = getDataDirectory();
			expect(result).toBe(path.join(path.dirname(require.resolve('../src/life-cycle/utils')), 'data'));
		});
	});

	describe('getLifeCycleStateInDirectory', () => {
		it('Should resolve null when file does not exist', async () => {
			mockedFs.readFile.mockImplementation((_path: any, callback: any) => {
				callback(new Error('ENOENT'), null);
			});

			const result = await getLifeCycleStateInDirectory('/some/dir');
			expect(result).toBeNull();
		});

		it('Should resolve null when file contains invalid JSON', async () => {
			mockedFs.readFile.mockImplementation((_path: any, callback: any) => {
				callback(null, Buffer.from('not-json'));
			});

			const result = await getLifeCycleStateInDirectory('/some/dir');
			expect(result).toBeNull();
		});

		it('Should resolve state with attempts: 1 merged in when file is valid JSON', async () => {
			const state = {
				previous: null,
				current: { extension: '1.0.0', vscode: '1.50.0' },
				apiAvailable: true,
				queue: []
			};
			mockedFs.readFile.mockImplementation((_path: any, callback: any) => {
				callback(null, Buffer.from(JSON.stringify(state)));
			});

			const result = await getLifeCycleStateInDirectory('/some/dir');
			expect(result).toEqual({ ...state, attempts: 1 });
		});

		it('Should preserve existing attempts value', async () => {
			const state = {
				previous: null,
				current: { extension: '1.0.0', vscode: '1.50.0' },
				apiAvailable: true,
				queue: [],
				attempts: 5
			};
			mockedFs.readFile.mockImplementation((_path: any, callback: any) => {
				callback(null, Buffer.from(JSON.stringify(state)));
			});

			const result = await getLifeCycleStateInDirectory('/some/dir');
			expect(result).toEqual(state);
		});
	});

	describe('saveLifeCycleStateInDirectory', () => {
		const state = {
			previous: null,
			current: { extension: '1.0.0', vscode: '1.50.0' },
			apiAvailable: true,
			queue: [] as any[],
			attempts: 1
		};

		it('Should write file when mkdir succeeds', async () => {
			mockedFs.mkdir.mockImplementation((_path: any, callback: any) => {
				callback(null);
			});
			mockedFs.writeFile.mockImplementation((_path: any, _data: any, callback: any) => {
				callback(null);
			});

			await saveLifeCycleStateInDirectory('/some/dir', state);

			expect(mockedFs.mkdir).toHaveBeenCalledWith('/some/dir', expect.any(Function));
			expect(mockedFs.writeFile).toHaveBeenCalledWith(
				path.join('/some/dir', 'life-cycle.json'),
				JSON.stringify(state),
				expect.any(Function)
			);
		});

		it('Should write file when mkdir fails with EEXIST', async () => {
			const eexistErr: NodeJS.ErrnoException = new Error('EEXIST');
			eexistErr.code = 'EEXIST';
			mockedFs.mkdir.mockImplementation((_path: any, callback: any) => {
				callback(eexistErr);
			});
			mockedFs.writeFile.mockImplementation((_path: any, _data: any, callback: any) => {
				callback(null);
			});

			await saveLifeCycleStateInDirectory('/some/dir', state);

			expect(mockedFs.writeFile).toHaveBeenCalled();
		});

		it('Should reject when mkdir fails with other error', async () => {
			const otherErr: NodeJS.ErrnoException = new Error('EPERM');
			otherErr.code = 'EPERM';
			mockedFs.mkdir.mockImplementation((_path: any, callback: any) => {
				callback(otherErr);
			});

			await expect(saveLifeCycleStateInDirectory('/some/dir', state)).rejects.toBeUndefined();
		});

		it('Should reject when writeFile fails', async () => {
			mockedFs.mkdir.mockImplementation((_path: any, callback: any) => {
				callback(null);
			});
			mockedFs.writeFile.mockImplementation((_path: any, _data: any, callback: any) => {
				callback(new Error('write failed'));
			});

			await expect(saveLifeCycleStateInDirectory('/some/dir', state)).rejects.toBeUndefined();
		});
	});

	describe('sendQueue', () => {
		it('Should return true for an empty queue', async () => {
			const result = await sendQueue([]);
			expect(result).toBe(true);
		});

		it('Should return true when event gets 201 response', async () => {
			const mockRes: any = {
				statusCode: 201,
				on: jest.fn((event: string, cb: Function) => {
					if (event === 'end') setTimeout(() => cb(), 0);
					if (event === 'data') { /* no-op */ }
					return mockRes;
				})
			};
			const mockReq: any = {
				on: jest.fn().mockReturnThis(),
				end: jest.fn()
			};
			mockedHttps.request.mockImplementation((_options: any, callback: any) => {
				setTimeout(() => callback(mockRes), 0);
				return mockReq;
			});

			const result = await sendQueue([{
				stage: LifeCycleStage.Install,
				extension: '1.0.0',
				vscode: '1.50.0',
				nonce: 'abc'
			}]);

			expect(result).toBe(true);
		});

		it('Should return false when event gets 410 response', async () => {
			const mockRes: any = {
				statusCode: 410,
				on: jest.fn((event: string, cb: Function) => {
					if (event === 'end') setTimeout(() => cb(), 0);
					if (event === 'data') { /* no-op */ }
					return mockRes;
				})
			};
			const mockReq: any = {
				on: jest.fn().mockReturnThis(),
				end: jest.fn()
			};
			mockedHttps.request.mockImplementation((_options: any, callback: any) => {
				setTimeout(() => callback(mockRes), 0);
				return mockReq;
			});

			const result = await sendQueue([{
				stage: LifeCycleStage.Install,
				extension: '1.0.0',
				vscode: '1.50.0',
				nonce: 'abc'
			}]);

			expect(result).toBe(false);
		});

		it('Should return true when multiple events all get 201 response', async () => {
			const mockRes: any = {
				statusCode: 201,
				on: jest.fn((event: string, cb: Function) => {
					if (event === 'end') setTimeout(() => cb(), 0);
					if (event === 'data') { /* no-op */ }
					return mockRes;
				})
			};
			const mockReq: any = {
				on: jest.fn().mockReturnThis(),
				end: jest.fn()
			};
			mockedHttps.request.mockImplementation((_options: any, callback: any) => {
				setTimeout(() => callback(mockRes), 0);
				return mockReq;
			});

			const result = await sendQueue([
				{ stage: LifeCycleStage.Install, extension: '1.0.0', vscode: '1.50.0', nonce: 'abc' },
				{ stage: LifeCycleStage.Update, from: { extension: '1.0.0', vscode: '1.50.0' }, to: { extension: '2.0.0', vscode: '1.51.0' }, nonce: 'def' }
			]);

			expect(result).toBe(true);
		});

		it('Should reject on request error', async () => {
			const mockReq: any = {
				on: jest.fn((event: string, cb: Function) => {
					if (event === 'error') setTimeout(() => cb(new Error('network error')), 0);
					return mockReq;
				}),
				end: jest.fn()
			};
			mockedHttps.request.mockImplementation((_options: any, _callback: any) => {
				return mockReq;
			});

			await expect(sendQueue([{
				stage: LifeCycleStage.Install,
				extension: '1.0.0',
				vscode: '1.50.0',
				nonce: 'abc'
			}])).rejects.toBeUndefined();
		});
	});
});
