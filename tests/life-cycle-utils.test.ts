import {
  LifeCycleStage,
  generateNonce,
  getDataDirectory,
  getLifeCycleStateInDirectory,
  saveLifeCycleStateInDirectory,
  sendQueue
} from '../src/life-cycle/utils';

describe('life-cycle/utils', () => {
  describe('LifeCycleStage', () => {
    it('Should export the enum values', () => {
      expect(LifeCycleStage.Install).toBe(0);
      expect(LifeCycleStage.Update).toBe(1);
      expect(LifeCycleStage.Uninstall).toBe(2);
    });
  });

  describe('generateNonce', () => {
    it('Should return an empty string (no-op)', () => {
      expect(generateNonce()).toBe('');
    });
  });

  describe('getDataDirectory', () => {
    it('Should return an empty string (no-op)', () => {
      expect(getDataDirectory()).toBe('');
    });
  });

  describe('getLifeCycleStateInDirectory', () => {
    it('Should resolve to null (no-op)', async () => {
      const result = await getLifeCycleStateInDirectory('/some/dir');
      expect(result).toBeNull();
    });
  });

  describe('saveLifeCycleStateInDirectory', () => {
    it('Should resolve without error (no-op)', async () => {
      await expect(
        saveLifeCycleStateInDirectory('/some/dir', {
          previous: null,
          current: { extension: '1.0.0', vscode: '1.50.0' },
          apiAvailable: true,
          queue: [],
          attempts: 1
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('sendQueue', () => {
    it('Should return true (no-op)', async () => {
      const result = await sendQueue([]);
      expect(result).toBe(true);
    });
  });
});
