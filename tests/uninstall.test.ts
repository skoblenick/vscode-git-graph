describe('uninstall', () => {
	it('Should be a no-op (telemetry removed for privacy compliance)', () => {
		expect(() => {
			jest.isolateModules(() => {
				require('../src/life-cycle/uninstall');
			});
		}).not.toThrow();
	});
});
