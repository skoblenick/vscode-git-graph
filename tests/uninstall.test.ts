describe('uninstall', () => {
  it('Should be a no-op (telemetry removed for privacy compliance)', async () => {
    await expect(import('../src/life-cycle/uninstall')).resolves.not.toThrow();
  });
});
