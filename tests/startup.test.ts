import * as vscode from './mocks/vscode';

import { onStartUp } from '../src/life-cycle/startup';

const extensionContext = vscode.mocks.extensionContext;

describe('onStartUp', () => {
  it('Should be a no-op (telemetry removed for privacy compliance)', async () => {
    await expect(onStartUp(extensionContext)).resolves.toBeUndefined();
  });
});
