const mockGetLifeCycleStateInDirectory = jest.fn();
const mockGetDataDirectory = jest.fn();
const mockSendQueue = jest.fn();
const mockGenerateNonce = jest.fn();

jest.mock('../src/life-cycle/utils', () => ({
	LifeCycleStage: { Install: 0, Update: 1, Uninstall: 2 },
	getLifeCycleStateInDirectory: mockGetLifeCycleStateInDirectory,
	getDataDirectory: mockGetDataDirectory,
	sendQueue: mockSendQueue,
	generateNonce: mockGenerateNonce
}));

beforeEach(() => {
	jest.clearAllMocks();
	mockGetDataDirectory.mockReturnValue('/mock/data');
	mockGenerateNonce.mockReturnValue('mock-nonce');
	mockSendQueue.mockResolvedValue(true);
});

describe('uninstall', () => {
	it('Should push Uninstall event and call sendQueue when state exists and apiAvailable', async () => {
		const state = {
			previous: null,
			current: { extension: '1.0.0', vscode: '1.50.0' },
			apiAvailable: true,
			queue: [] as any[],
			attempts: 1
		};
		mockGetLifeCycleStateInDirectory.mockResolvedValue(state);

		jest.isolateModules(() => {
			require('../src/life-cycle/uninstall');
		});

		await new Promise(resolve => setTimeout(resolve, 50));

		expect(mockSendQueue).toHaveBeenCalledTimes(1);
		expect(mockSendQueue).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({
					stage: 2,
					extension: '1.0.0',
					vscode: '1.50.0'
				})
			])
		);
	});

	it('Should not call sendQueue when state is null', async () => {
		mockGetLifeCycleStateInDirectory.mockResolvedValue(null);

		jest.isolateModules(() => {
			require('../src/life-cycle/uninstall');
		});

		await new Promise(resolve => setTimeout(resolve, 50));

		expect(mockSendQueue).not.toHaveBeenCalled();
	});

	it('Should not call sendQueue when state exists but apiAvailable is false', async () => {
		mockGetLifeCycleStateInDirectory.mockResolvedValue({
			previous: null,
			current: { extension: '1.0.0', vscode: '1.50.0' },
			apiAvailable: false,
			queue: [],
			attempts: 1
		});

		jest.isolateModules(() => {
			require('../src/life-cycle/uninstall');
		});

		await new Promise(resolve => setTimeout(resolve, 50));

		expect(mockSendQueue).not.toHaveBeenCalled();
	});

	it('Should silently catch errors', async () => {
		mockGetLifeCycleStateInDirectory.mockRejectedValue(new Error('fail'));

		expect(() => {
			jest.isolateModules(() => {
				require('../src/life-cycle/uninstall');
			});
		}).not.toThrow();

		await new Promise(resolve => setTimeout(resolve, 50));
	});
});
