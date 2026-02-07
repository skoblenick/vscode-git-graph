import * as vscode from './mocks/vscode';
jest.mock('vscode', () => vscode, { virtual: true });

jest.mock('fs');

const mockGetLifeCycleStateInDirectory = jest.fn();
const mockSaveLifeCycleStateInDirectory = jest.fn();
const mockSendQueue = jest.fn();
const mockGetDataDirectory = jest.fn();
const mockGenerateNonce = jest.fn();

jest.mock('../src/life-cycle/utils', () => ({
	LifeCycleStage: { Install: 0, Update: 1, Uninstall: 2 },
	getLifeCycleStateInDirectory: mockGetLifeCycleStateInDirectory,
	saveLifeCycleStateInDirectory: mockSaveLifeCycleStateInDirectory,
	sendQueue: mockSendQueue,
	getDataDirectory: mockGetDataDirectory,
	generateNonce: mockGenerateNonce
}));

const mockGetExtensionVersion = jest.fn();
jest.mock('../src/utils', () => ({
	getExtensionVersion: mockGetExtensionVersion
}));

import * as fs from 'fs';
import { onStartUp } from '../src/life-cycle/startup';

const mockedFs = jest.mocked(fs);
const extensionContext = vscode.mocks.extensionContext;

beforeEach(() => {
	mockGetDataDirectory.mockReturnValue('/mock/data');
	mockSaveLifeCycleStateInDirectory.mockResolvedValue(undefined);
	mockSendQueue.mockResolvedValue(true);
	mockGetExtensionVersion.mockResolvedValue('2.0.0');
	mockGenerateNonce.mockReturnValue('mock-nonce');

	mockedFs.mkdir.mockImplementation((_path: any, callback: any) => {
		callback(null);
	});
	mockedFs.writeFile.mockImplementation((_path: any, _data: any, callback: any) => {
		callback(null);
	});
	mockedFs.readFile.mockImplementation((_path: any, callback: any) => {
		callback(new Error('ENOENT'), null);
	});

	(vscode.env as any).sessionId = 'real-session-id';
	(vscode as any).version = '1.51.0';
});

describe('onStartUp', () => {
	it('Should return early when running in Extension Development Host', async () => {
		(vscode.env as any).sessionId = 'someValue.sessionId';

		await onStartUp(extensionContext);

		expect(mockGetLifeCycleStateInDirectory).not.toHaveBeenCalled();
	});

	it('Should return early when API is unavailable', async () => {
		mockGetLifeCycleStateInDirectory.mockResolvedValue({
			previous: null,
			current: { extension: '1.0.0', vscode: '1.50.0' },
			apiAvailable: false,
			queue: [],
			attempts: 1
		});

		await onStartUp(extensionContext);

		expect(mockSendQueue).not.toHaveBeenCalled();
	});

	it('Should create an Install event when state is null', async () => {
		mockGetLifeCycleStateInDirectory.mockResolvedValue(null);

		mockedFs.mkdir.mockImplementation((_path: any, callback: any) => {
			callback(null);
		});
		mockedFs.writeFile.mockImplementation((_path: any, _data: any, callback: any) => {
			callback(null);
		});

		await onStartUp(extensionContext);

		expect(mockSaveLifeCycleStateInDirectory).toHaveBeenCalled();
		expect(mockSendQueue).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({ stage: 0 })
			])
		);
	});

	it('Should create an Update event when extension version changes', async () => {
		mockGetLifeCycleStateInDirectory.mockResolvedValue({
			previous: null,
			current: { extension: '1.0.0', vscode: '1.50.0' },
			apiAvailable: true,
			queue: [],
			attempts: 1
		});

		await onStartUp(extensionContext);

		expect(mockSendQueue).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({ stage: 1 })
			])
		);
	});

	it('Should retry sending queue when attempts < 2 and queue is not empty', async () => {
		mockGetLifeCycleStateInDirectory.mockResolvedValue({
			previous: null,
			current: { extension: '2.0.0', vscode: '1.51.0' },
			apiAvailable: true,
			queue: [{ stage: 0, extension: '2.0.0', vscode: '1.51.0', nonce: 'old-nonce' }],
			attempts: 1
		});

		await onStartUp(extensionContext);

		expect(mockSendQueue).toHaveBeenCalled();
		const savedState = mockSaveLifeCycleStateInDirectory.mock.calls[0][1];
		expect(savedState.attempts).toBe(2);
	});

	it('Should do nothing when state exists with same version and empty queue', async () => {
		mockGetLifeCycleStateInDirectory.mockResolvedValue({
			previous: null,
			current: { extension: '2.0.0', vscode: '1.51.0' },
			apiAvailable: true,
			queue: [],
			attempts: 1
		});

		await onStartUp(extensionContext);

		expect(mockSendQueue).not.toHaveBeenCalled();
		expect(mockSaveLifeCycleStateInDirectory).not.toHaveBeenCalled();
	});
});
