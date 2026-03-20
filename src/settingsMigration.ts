import * as vscode from 'vscode';

const SETTING_MIGRATION_KEY = 'settingsMigration.v1.done';

const MIGRATIONS: { oldKey: string; newKey: string }[] = [
  { oldKey: 'autoCenterCommitDetailsView', newKey: 'commitDetailsView.autoCenter' },
  {
    oldKey: 'commitDetailsViewFileTreeCompactFolders',
    newKey: 'commitDetailsView.fileView.fileTree.compactFolders'
  },
  { oldKey: 'defaultFileViewType', newKey: 'commitDetailsView.fileView.type' },
  { oldKey: 'commitDetailsViewLocation', newKey: 'commitDetailsView.location' },
  { oldKey: 'dateFormat', newKey: 'date.format' },
  { oldKey: 'dateType', newKey: 'date.type' },
  { oldKey: 'fetchAvatars', newKey: 'repository.commits.fetchAvatars' },
  { oldKey: 'graphColours', newKey: 'graph.colours' },
  { oldKey: 'graphStyle', newKey: 'graph.style' },
  {
    oldKey: 'includeCommitsMentionedByReflogs',
    newKey: 'repository.includeCommitsMentionedByReflogs'
  },
  { oldKey: 'initialLoadCommits', newKey: 'repository.commits.initialLoad' },
  { oldKey: 'loadMoreCommits', newKey: 'repository.commits.loadMore' },
  { oldKey: 'loadMoreCommitsAutomatically', newKey: 'repository.commits.loadMoreAutomatically' },
  {
    oldKey: 'muteCommitsThatAreNotAncestorsOfHead',
    newKey: 'repository.commits.mute.commitsThatAreNotAncestorsOfHead'
  },
  { oldKey: 'muteMergeCommits', newKey: 'repository.commits.mute.mergeCommits' },
  { oldKey: 'onlyFollowFirstParent', newKey: 'repository.onlyFollowFirstParent' },
  { oldKey: 'openDiffTabLocation', newKey: 'openNewTabEditorGroup' },
  { oldKey: 'openRepoToHead', newKey: 'repository.onLoad.scrollToHead' },
  { oldKey: 'referenceLabelAlignment', newKey: 'referenceLabels.alignment' },
  {
    oldKey: 'showCommitsOnlyReferencedByTags',
    newKey: 'repository.showCommitsOnlyReferencedByTags'
  },
  { oldKey: 'showCurrentBranchByDefault', newKey: 'repository.onLoad.showCheckedOutBranch' },
  { oldKey: 'showSignatureStatus', newKey: 'repository.commits.showSignatureStatus' },
  { oldKey: 'showTags', newKey: 'repository.showTags' },
  { oldKey: 'showUncommittedChanges', newKey: 'repository.showUncommittedChanges' },
  { oldKey: 'showUntrackedFiles', newKey: 'repository.showUntrackedFiles' },
  { oldKey: 'useMailmap', newKey: 'repository.useMailmap' },
  {
    oldKey: 'combineLocalAndRemoteBranchLabels',
    newKey: 'referenceLabels.combineLocalAndRemoteBranchLabels'
  },
  { oldKey: 'commitOrdering', newKey: 'repository.commits.order' },
  { oldKey: 'fetchAndPrune', newKey: 'repository.fetchAndPrune' }
];

export async function migrateDeprecatedSettings(context: vscode.ExtensionContext): Promise<void> {
  if (context.globalState.get<boolean>(SETTING_MIGRATION_KEY, false)) {
    return;
  }

  const config = vscode.workspace.getConfiguration('git-graph');

  for (const { oldKey, newKey } of MIGRATIONS) {
    const oldInspect = config.inspect(oldKey);
    const newInspect = config.inspect(newKey);

    if (oldInspect) {
      if (
        oldInspect.workspaceValue !== undefined &&
        (newInspect === undefined || newInspect.workspaceValue === undefined)
      ) {
        await config.update(
          newKey,
          oldInspect.workspaceValue,
          vscode.ConfigurationTarget.Workspace
        );
      }
      if (
        oldInspect.globalValue !== undefined &&
        (newInspect === undefined || newInspect.globalValue === undefined)
      ) {
        await config.update(newKey, oldInspect.globalValue, vscode.ConfigurationTarget.Global);
      }
    }
  }

  await context.globalState.update(SETTING_MIGRATION_KEY, true);
}
