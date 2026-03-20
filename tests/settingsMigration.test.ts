import * as vscode from './mocks/vscode';
jest.mock('vscode', () => vscode, { virtual: true });

import { migrateDeprecatedSettings } from '../src/settingsMigration';

const workspaceConfiguration = vscode.mocks.workspaceConfiguration;
const extensionContext = vscode.mocks.extensionContext;

describe('migrateDeprecatedSettings', () => {
  beforeEach(() => {
    extensionContext.globalState.get.mockReturnValue(false);
    extensionContext.globalState.update.mockResolvedValue(undefined);
  });

  it('Should skip migration when already completed', async () => {
    extensionContext.globalState.get.mockReturnValue(true);

    await migrateDeprecatedSettings(extensionContext);

    expect(workspaceConfiguration.inspect).not.toHaveBeenCalled();
    expect(workspaceConfiguration.update).not.toHaveBeenCalled();
  });

  it('Should migrate old global value to new key when new key is unset', async () => {
    workspaceConfiguration.inspect.mockImplementation((section: string) => {
      if (section === 'autoCenterCommitDetailsView') {
        return { globalValue: false, workspaceValue: undefined };
      }
      if (section === 'commitDetailsView.autoCenter') {
        return { globalValue: undefined, workspaceValue: undefined };
      }
      return { globalValue: undefined, workspaceValue: undefined };
    });

    await migrateDeprecatedSettings(extensionContext);

    expect(workspaceConfiguration.update).toHaveBeenCalledWith(
      'commitDetailsView.autoCenter',
      false,
      vscode.ConfigurationTarget.Global
    );
    expect(extensionContext.globalState.update).toHaveBeenCalledWith(
      'settingsMigration.v1.done',
      true
    );
  });

  it('Should migrate old workspace value to new key when new key is unset', async () => {
    workspaceConfiguration.inspect.mockImplementation((section: string) => {
      if (section === 'graphStyle') {
        return { globalValue: undefined, workspaceValue: 'angular' };
      }
      if (section === 'graph.style') {
        return { globalValue: undefined, workspaceValue: undefined };
      }
      return { globalValue: undefined, workspaceValue: undefined };
    });

    await migrateDeprecatedSettings(extensionContext);

    expect(workspaceConfiguration.update).toHaveBeenCalledWith(
      'graph.style',
      'angular',
      vscode.ConfigurationTarget.Workspace
    );
  });

  it('Should migrate both global and workspace values simultaneously', async () => {
    workspaceConfiguration.inspect.mockImplementation((section: string) => {
      if (section === 'fetchAvatars') {
        return { globalValue: true, workspaceValue: false };
      }
      if (section === 'repository.commits.fetchAvatars') {
        return { globalValue: undefined, workspaceValue: undefined };
      }
      return { globalValue: undefined, workspaceValue: undefined };
    });

    await migrateDeprecatedSettings(extensionContext);

    expect(workspaceConfiguration.update).toHaveBeenCalledWith(
      'repository.commits.fetchAvatars',
      false,
      vscode.ConfigurationTarget.Workspace
    );
    expect(workspaceConfiguration.update).toHaveBeenCalledWith(
      'repository.commits.fetchAvatars',
      true,
      vscode.ConfigurationTarget.Global
    );
  });

  it('Should NOT overwrite existing new key values', async () => {
    workspaceConfiguration.inspect.mockImplementation((section: string) => {
      if (section === 'autoCenterCommitDetailsView') {
        return { globalValue: false, workspaceValue: undefined };
      }
      if (section === 'commitDetailsView.autoCenter') {
        return { globalValue: true, workspaceValue: undefined };
      }
      return { globalValue: undefined, workspaceValue: undefined };
    });

    await migrateDeprecatedSettings(extensionContext);

    const updateCalls = workspaceConfiguration.update.mock.calls.filter(
      (call: any[]) =>
        call[0] === 'commitDetailsView.autoCenter' && call[2] === vscode.ConfigurationTarget.Global
    );
    expect(updateCalls).toHaveLength(0);
  });

  it('Should be a no-op when old key has no value', async () => {
    workspaceConfiguration.inspect.mockImplementation(() => {
      return { globalValue: undefined, workspaceValue: undefined };
    });

    await migrateDeprecatedSettings(extensionContext);

    expect(workspaceConfiguration.update).not.toHaveBeenCalled();
    expect(extensionContext.globalState.update).toHaveBeenCalledWith(
      'settingsMigration.v1.done',
      true
    );
  });

  it('Should be idempotent (second call is a no-op)', async () => {
    extensionContext.globalState.get.mockReturnValue(false);
    workspaceConfiguration.inspect.mockImplementation((section: string) => {
      if (section === 'graphStyle') {
        return { globalValue: 'angular', workspaceValue: undefined };
      }
      if (section === 'graph.style') {
        return { globalValue: undefined, workspaceValue: undefined };
      }
      return { globalValue: undefined, workspaceValue: undefined };
    });

    await migrateDeprecatedSettings(extensionContext);

    expect(workspaceConfiguration.update).toHaveBeenCalledTimes(1);
    expect(extensionContext.globalState.update).toHaveBeenCalledWith(
      'settingsMigration.v1.done',
      true
    );

    jest.clearAllMocks();
    extensionContext.globalState.get.mockReturnValue(true);

    await migrateDeprecatedSettings(extensionContext);

    expect(workspaceConfiguration.update).not.toHaveBeenCalled();
  });

  it('Should mark migration as complete even when no settings needed migration', async () => {
    workspaceConfiguration.inspect.mockImplementation(() => {
      return { globalValue: undefined, workspaceValue: undefined };
    });

    await migrateDeprecatedSettings(extensionContext);

    expect(extensionContext.globalState.update).toHaveBeenCalledWith(
      'settingsMigration.v1.done',
      true
    );
  });
});
