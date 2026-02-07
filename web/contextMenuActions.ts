function buildBranchContextMenuActions(view: GitGraphView, target: DialogTarget & RefTarget): ContextMenuActions {
	const refName = target.ref, visibility = view.getConfig().contextMenuActionsVisibility.branch;
	const isSelectedInBranchesDropdown = view.getBranchDropdown().isSelected(refName);
	const gitBranchHead = view.getGitBranchHead();
	const gitRemotes = view.getGitRemotes();
	const gitBranches = view.getBranches();
	const currentRepo = view.getCurrentRepo();
	const gitRepos = view.getGitRepos();
	const config = view.getConfig();
	return [[
		{
			title: 'Checkout Branch',
			visible: visibility.checkout && gitBranchHead !== refName,
			onClick: () => checkoutBranchAction(view, refName, null, null, target)
		}, {
			title: 'Rename Branch' + ELLIPSIS,
			visible: visibility.rename,
			onClick: () => {
				dialog.showRefInput('Enter the new name for branch <b><i>' + escapeHtml(refName) + '</i></b>:', refName, 'Rename Branch', (newName) => {
					runAction({ command: 'renameBranch', repo: currentRepo, oldName: refName, newName: newName }, 'Renaming Branch');
				}, target);
			}
		}, {
			title: 'Delete Branch' + ELLIPSIS,
			visible: visibility.delete && gitBranchHead !== refName,
			onClick: () => {
				let remotesWithBranch = gitRemotes.filter(remote => gitBranches.includes('remotes/' + remote + '/' + refName));
				let inputs: DialogInput[] = [{ type: DialogInputType.Checkbox, name: 'Force Delete', value: config.dialogDefaults.deleteBranch.forceDelete }];
				if (remotesWithBranch.length > 0) {
					inputs.push({
						type: DialogInputType.Checkbox,
						name: 'Delete this branch on the remote' + (gitRemotes.length > 1 ? 's' : ''),
						value: false,
						info: 'This branch is on the remote' + (remotesWithBranch.length > 1 ? 's: ' : ' ') + formatCommaSeparatedList(remotesWithBranch.map((remote) => '"' + remote + '"'))
					});
				}
				dialog.showForm('Are you sure you want to delete the branch <b><i>' + escapeHtml(refName) + '</i></b>?', inputs, 'Yes, delete', (values) => {
					runAction({ command: 'deleteBranch', repo: currentRepo, branchName: refName, forceDelete: <boolean>values[0], deleteOnRemotes: remotesWithBranch.length > 0 && <boolean>values[1] ? remotesWithBranch : [] }, 'Deleting Branch');
				}, target);
			}
		}, {
			title: 'Merge into current branch' + ELLIPSIS,
			visible: visibility.merge && gitBranchHead !== refName,
			onClick: () => mergeAction(view, refName, refName, GG.MergeActionOn.Branch, target)
		}, {
			title: 'Rebase current branch on Branch' + ELLIPSIS,
			visible: visibility.rebase && gitBranchHead !== refName,
			onClick: () => rebaseAction(view, refName, refName, GG.RebaseActionOn.Branch, target)
		}, {
			title: 'Push Branch' + ELLIPSIS,
			visible: visibility.push && gitRemotes.length > 0,
			onClick: () => {
				const multipleRemotes = gitRemotes.length > 1;
				const inputs: DialogInput[] = [
					{ type: DialogInputType.Checkbox, name: 'Set Upstream', value: true },
					{
						type: DialogInputType.Radio,
						name: 'Push Mode',
						options: [
							{ name: 'Normal', value: GG.GitPushBranchMode.Normal },
							{ name: 'Force With Lease', value: GG.GitPushBranchMode.ForceWithLease },
							{ name: 'Force', value: GG.GitPushBranchMode.Force }
						],
						default: GG.GitPushBranchMode.Normal
					}
				];

				if (multipleRemotes) {
					inputs.unshift({
						type: DialogInputType.Select,
						name: 'Push to Remote(s)',
						defaults: [view.getPushRemote(refName)],
						options: gitRemotes.map((remote) => ({ name: remote, value: remote })),
						multiple: true
					});
				}

				const gitConfig = view.getGitConfig();
				dialog.showForm('Are you sure you want to push the branch <b><i>' + escapeHtml(refName) + '</i></b>' + (multipleRemotes ? '' : ' to the remote <b><i>' + escapeHtml(gitRemotes[0]) + '</i></b>') + '?', inputs, 'Yes, push', (values) => {
					const remotes = multipleRemotes ? <string[]>values.shift() : [gitRemotes[0]];
					const setUpstream = <boolean>values[0];
					runAction({
						command: 'pushBranch',
						repo: currentRepo,
						branchName: refName,
						remotes: remotes,
						setUpstream: setUpstream,
						mode: <GG.GitPushBranchMode>values[1],
						willUpdateBranchConfig: setUpstream && remotes.length > 0 && (gitConfig === null || typeof gitConfig.branches[refName] === 'undefined' || gitConfig.branches[refName].remote !== remotes[remotes.length - 1])
					}, 'Pushing Branch');
				}, target);
			}
		}
	], [
		buildViewIssueAction(view, refName, visibility.viewIssue, target),
		{
			title: 'Create Pull Request' + ELLIPSIS,
			visible: visibility.createPullRequest && gitRepos[currentRepo].pullRequestConfig !== null,
			onClick: () => {
				const prConfig = gitRepos[currentRepo].pullRequestConfig;
				if (prConfig === null) return;
				dialog.showCheckbox('Are you sure you want to create a Pull Request for branch <b><i>' + escapeHtml(refName) + '</i></b>?', 'Push branch before creating the Pull Request', true, 'Yes, create Pull Request', (push) => {
					runAction({ command: 'createPullRequest', repo: currentRepo, config: prConfig, sourceRemote: prConfig.sourceRemote, sourceOwner: prConfig.sourceOwner, sourceRepo: prConfig.sourceRepo, sourceBranch: refName, push: push }, 'Creating Pull Request');
				}, target);
			}
		}
	], [
		{
			title: 'Create Archive',
			visible: visibility.createArchive,
			onClick: () => {
				runAction({ command: 'createArchive', repo: currentRepo, ref: refName }, 'Creating Archive');
			}
		},
		{
			title: 'Select in Branches Dropdown',
			visible: visibility.selectInBranchesDropdown && !isSelectedInBranchesDropdown,
			onClick: () => view.getBranchDropdown().selectOption(refName)
		},
		{
			title: 'Unselect in Branches Dropdown',
			visible: visibility.unselectInBranchesDropdown && isSelectedInBranchesDropdown,
			onClick: () => view.getBranchDropdown().unselectOption(refName)
		}
	], [
		{
			title: 'Copy Branch Name to Clipboard',
			visible: visibility.copyName,
			onClick: () => {
				sendMessage({ command: 'copyToClipboard', type: 'Branch Name', data: refName });
			}
		}
	]];
}

function buildCommitContextMenuActions(view: GitGraphView, target: DialogTarget & CommitTarget): ContextMenuActions {
	const hash = target.hash, visibility = view.getConfig().contextMenuActionsVisibility.commit;
	const commits = view.getCommits();
	const commitLookup = view.getCommitLookup();
	const commit = commits[commitLookup[hash]];
	const currentRepo = view.getCurrentRepo();
	const config = view.getConfig();
	const gitBranchHead = view.getGitBranchHead();
	return [[
		{
			title: 'Add Tag' + ELLIPSIS,
			visible: visibility.addTag,
			onClick: () => addTagAction(view, hash, '', config.dialogDefaults.addTag.type, '', null, target)
		}, {
			title: 'Create Branch' + ELLIPSIS,
			visible: visibility.createBranch,
			onClick: () => createBranchAction(view, hash, '', config.dialogDefaults.createBranch.checkout, target)
		}
	], [
		{
			title: 'Checkout' + (globalState.alwaysAcceptCheckoutCommit ? '' : ELLIPSIS),
			visible: visibility.checkout,
			onClick: () => {
				const checkoutCommit = () => runAction({ command: 'checkoutCommit', repo: currentRepo, commitHash: hash }, 'Checking out Commit');
				if (globalState.alwaysAcceptCheckoutCommit) {
					checkoutCommit();
				} else {
					dialog.showCheckbox('Are you sure you want to checkout commit <b><i>' + abbrevCommit(hash) + '</i></b>? This will result in a \'detached HEAD\' state.', 'Always Accept', false, 'Yes, checkout', (alwaysAccept) => {
						if (alwaysAccept) {
							updateGlobalViewState('alwaysAcceptCheckoutCommit', true);
						}
						checkoutCommit();
					}, target);
				}
			}
		}, {
			title: 'Cherry Pick' + ELLIPSIS,
			visible: visibility.cherrypick,
			onClick: () => {
				const isMerge = commit.parents.length > 1;
				let inputs: DialogInput[] = [];
				if (isMerge) {
					let options = commit.parents.map((hash, index) => ({
						name: abbrevCommit(hash) + (typeof commitLookup[hash] === 'number' ? ': ' + commits[commitLookup[hash]].message : ''),
						value: (index + 1).toString()
					}));
					inputs.push({
						type: DialogInputType.Select,
						name: 'Parent Hash',
						options: options,
						default: '1',
						info: 'Choose the parent hash on the main branch, to cherry pick the commit relative to.'
					});
				}
				inputs.push({
					type: DialogInputType.Checkbox,
					name: 'Record Origin',
					value: config.dialogDefaults.cherryPick.recordOrigin,
					info: 'Record that this commit was the origin of the cherry pick by appending a line to the original commit message that states "(cherry picked from commit ...​)".'
				}, {
					type: DialogInputType.Checkbox,
					name: 'No Commit',
					value: config.dialogDefaults.cherryPick.noCommit,
					info: 'Cherry picked changes will be staged but not committed, so that you can select and commit specific parts of this commit.'
				});

				dialog.showForm('Are you sure you want to cherry pick commit <b><i>' + abbrevCommit(hash) + '</i></b>?', inputs, 'Yes, cherry pick', (values) => {
					let parentIndex = isMerge ? parseInt(<string>values.shift()) : 0;
					runAction({
						command: 'cherrypickCommit',
						repo: currentRepo,
						commitHash: hash,
						parentIndex: parentIndex,
						recordOrigin: <boolean>values[0],
						noCommit: <boolean>values[1]
					}, 'Cherry picking Commit');
				}, target);
			}
		}, {
			title: 'Revert' + ELLIPSIS,
			visible: visibility.revert,
			onClick: () => {
				if (commit.parents.length > 1) {
					let options = commit.parents.map((hash, index) => ({
						name: abbrevCommit(hash) + (typeof commitLookup[hash] === 'number' ? ': ' + commits[commitLookup[hash]].message : ''),
						value: (index + 1).toString()
					}));
					dialog.showSelect('Are you sure you want to revert merge commit <b><i>' + abbrevCommit(hash) + '</i></b>? Choose the parent hash on the main branch, to revert the commit relative to:', '1', options, 'Yes, revert', (parentIndex) => {
						runAction({ command: 'revertCommit', repo: currentRepo, commitHash: hash, parentIndex: parseInt(parentIndex) }, 'Reverting Commit');
					}, target);
				} else {
					dialog.showConfirmation('Are you sure you want to revert commit <b><i>' + abbrevCommit(hash) + '</i></b>?', 'Yes, revert', () => {
						runAction({ command: 'revertCommit', repo: currentRepo, commitHash: hash, parentIndex: 0 }, 'Reverting Commit');
					}, target);
				}
			}
		}, {
			title: 'Drop' + ELLIPSIS,
			visible: visibility.drop && view.getGraph().dropCommitPossible(commitLookup[hash]),
			onClick: () => {
				dialog.showConfirmation('Are you sure you want to permanently drop commit <b><i>' + abbrevCommit(hash) + '</i></b>?' + (view.getOnlyFollowFirstParent() ? '<br/><i>Note: By enabling "Only follow the first parent of commits", some commits may have been hidden from the Git Graph View that could affect the outcome of performing this action.</i>' : ''), 'Yes, drop', () => {
					runAction({ command: 'dropCommit', repo: currentRepo, commitHash: hash }, 'Dropping Commit');
				}, target);
			}
		}
	], [
		{
			title: 'Merge into current branch' + ELLIPSIS,
			visible: visibility.merge,
			onClick: () => mergeAction(view, hash, abbrevCommit(hash), GG.MergeActionOn.Commit, target)
		}, {
			title: 'Rebase current branch on this Commit' + ELLIPSIS,
			visible: visibility.rebase,
			onClick: () => rebaseAction(view, hash, abbrevCommit(hash), GG.RebaseActionOn.Commit, target)
		}, {
			title: 'Reset current branch to this Commit' + ELLIPSIS,
			visible: visibility.reset,
			onClick: () => {
				dialog.showSelect('Are you sure you want to reset ' + (gitBranchHead !== null ? '<b><i>' + escapeHtml(gitBranchHead) + '</i></b> (the current branch)' : 'the current branch') + ' to commit <b><i>' + abbrevCommit(hash) + '</i></b>?', config.dialogDefaults.resetCommit.mode, [
					{ name: 'Soft - Keep all changes, but reset head', value: GG.GitResetMode.Soft },
					{ name: 'Mixed - Keep working tree, but reset index', value: GG.GitResetMode.Mixed },
					{ name: 'Hard - Discard all changes', value: GG.GitResetMode.Hard }
				], 'Yes, reset', (mode) => {
					runAction({ command: 'resetToCommit', repo: currentRepo, commit: hash, resetMode: <GG.GitResetMode>mode }, 'Resetting to Commit');
				}, target);
			}
		}
	], [
		{
			title: 'Copy Commit Hash to Clipboard',
			visible: visibility.copyHash,
			onClick: () => {
				sendMessage({ command: 'copyToClipboard', type: 'Commit Hash', data: hash });
			}
		},
		{
			title: 'Copy Commit Subject to Clipboard',
			visible: visibility.copySubject,
			onClick: () => {
				sendMessage({ command: 'copyToClipboard', type: 'Commit Subject', data: commit.message });
			}
		}
	]];
}

function buildRemoteBranchContextMenuActions(view: GitGraphView, remote: string, target: DialogTarget & RefTarget): ContextMenuActions {
	const refName = target.ref, visibility = view.getConfig().contextMenuActionsVisibility.remoteBranch;
	const branchName = remote !== '' ? refName.substring(remote.length + 1) : '';
	const prefixedRefName = 'remotes/' + refName;
	const isSelectedInBranchesDropdown = view.getBranchDropdown().isSelected(prefixedRefName);
	const gitBranches = view.getBranches();
	const gitBranchHead = view.getGitBranchHead();
	const currentRepo = view.getCurrentRepo();
	const gitRepos = view.getGitRepos();
	const config = view.getConfig();
	return [[
		{
			title: 'Checkout Branch' + ELLIPSIS,
			visible: visibility.checkout,
			onClick: () => checkoutBranchAction(view, refName, remote, null, target)
		}, {
			title: 'Delete Remote Branch' + ELLIPSIS,
			visible: visibility.delete && remote !== '',
			onClick: () => {
				dialog.showConfirmation('Are you sure you want to delete the remote branch <b><i>' + escapeHtml(refName) + '</i></b>?', 'Yes, delete', () => {
					runAction({ command: 'deleteRemoteBranch', repo: currentRepo, branchName: branchName, remote: remote }, 'Deleting Remote Branch');
				}, target);
			}
		}, {
			title: 'Fetch into local branch' + ELLIPSIS,
			visible: visibility.fetch && remote !== '' && gitBranches.includes(branchName) && gitBranchHead !== branchName,
			onClick: () => {
				dialog.showForm('Are you sure you want to fetch the remote branch <b><i>' + escapeHtml(refName) + '</i></b> into the local branch <b><i>' + escapeHtml(branchName) + '</i></b>?', [{
					type: DialogInputType.Checkbox,
					name: 'Force Fetch',
					value: config.dialogDefaults.fetchIntoLocalBranch.forceFetch,
					info: 'Force the local branch to be reset to this remote branch.'
				}], 'Yes, fetch', (values) => {
					runAction({ command: 'fetchIntoLocalBranch', repo: currentRepo, remote: remote, remoteBranch: branchName, localBranch: branchName, force: <boolean>values[0] }, 'Fetching Branch');
				}, target);
			}
		}, {
			title: 'Merge into current branch' + ELLIPSIS,
			visible: visibility.merge,
			onClick: () => mergeAction(view, refName, refName, GG.MergeActionOn.RemoteTrackingBranch, target)
		}, {
			title: 'Pull into current branch' + ELLIPSIS,
			visible: visibility.pull && remote !== '',
			onClick: () => {
				dialog.showForm('Are you sure you want to pull the remote branch <b><i>' + escapeHtml(refName) + '</i></b> into ' + (gitBranchHead !== null ? '<b><i>' + escapeHtml(gitBranchHead) + '</i></b> (the current branch)' : 'the current branch') + '? If a merge is required:', [
					{ type: DialogInputType.Checkbox, name: 'Create a new commit even if fast-forward is possible', value: config.dialogDefaults.pullBranch.noFastForward },
					{ type: DialogInputType.Checkbox, name: 'Squash Commits', value: config.dialogDefaults.pullBranch.squash, info: 'Create a single commit on the current branch whose effect is the same as merging this remote branch.' }
				], 'Yes, pull', (values) => {
					runAction({ command: 'pullBranch', repo: currentRepo, branchName: branchName, remote: remote, createNewCommit: <boolean>values[0], squash: <boolean>values[1] }, 'Pulling Branch');
				}, target);
			}
		}
	], [
		buildViewIssueAction(view, refName, visibility.viewIssue, target),
		{
			title: 'Create Pull Request',
			visible: visibility.createPullRequest && gitRepos[currentRepo].pullRequestConfig !== null && branchName !== 'HEAD' &&
				(gitRepos[currentRepo].pullRequestConfig!.sourceRemote === remote || gitRepos[currentRepo].pullRequestConfig!.destRemote === remote),
			onClick: () => {
				const prConfig = gitRepos[currentRepo].pullRequestConfig;
				if (prConfig === null) return;
				const isDestRemote = prConfig.destRemote === remote;
				runAction({
					command: 'createPullRequest',
					repo: currentRepo,
					config: prConfig,
					sourceRemote: isDestRemote ? prConfig.destRemote! : prConfig.sourceRemote,
					sourceOwner: isDestRemote ? prConfig.destOwner : prConfig.sourceOwner,
					sourceRepo: isDestRemote ? prConfig.destRepo : prConfig.sourceRepo,
					sourceBranch: branchName,
					push: false
				}, 'Creating Pull Request');
			}
		}
	], [
		{
			title: 'Create Archive',
			visible: visibility.createArchive,
			onClick: () => {
				runAction({ command: 'createArchive', repo: currentRepo, ref: refName }, 'Creating Archive');
			}
		},
		{
			title: 'Select in Branches Dropdown',
			visible: visibility.selectInBranchesDropdown && !isSelectedInBranchesDropdown,
			onClick: () => view.getBranchDropdown().selectOption(prefixedRefName)
		},
		{
			title: 'Unselect in Branches Dropdown',
			visible: visibility.unselectInBranchesDropdown && isSelectedInBranchesDropdown,
			onClick: () => view.getBranchDropdown().unselectOption(prefixedRefName)
		}
	], [
		{
			title: 'Copy Branch Name to Clipboard',
			visible: visibility.copyName,
			onClick: () => {
				sendMessage({ command: 'copyToClipboard', type: 'Branch Name', data: refName });
			}
		}
	]];
}

function buildStashContextMenuActions(view: GitGraphView, target: DialogTarget & RefTarget): ContextMenuActions {
	const hash = target.hash, selector = target.ref, visibility = view.getConfig().contextMenuActionsVisibility.stash;
	const currentRepo = view.getCurrentRepo();
	const config = view.getConfig();
	return [[
		{
			title: 'Apply Stash' + ELLIPSIS,
			visible: visibility.apply,
			onClick: () => {
				dialog.showForm('Are you sure you want to apply the stash <b><i>' + escapeHtml(selector.substring(5)) + '</i></b>?', [{
					type: DialogInputType.Checkbox,
					name: 'Reinstate Index',
					value: config.dialogDefaults.applyStash.reinstateIndex,
					info: 'Attempt to reinstate the indexed changes, in addition to the working tree\'s changes.'
				}], 'Yes, apply stash', (values) => {
					runAction({ command: 'applyStash', repo: currentRepo, selector: selector, reinstateIndex: <boolean>values[0] }, 'Applying Stash');
				}, target);
			}
		}, {
			title: 'Create Branch from Stash' + ELLIPSIS,
			visible: visibility.createBranch,
			onClick: () => {
				dialog.showRefInput('Create a branch from stash <b><i>' + escapeHtml(selector.substring(5)) + '</i></b> with the name:', '', 'Create Branch', (branchName) => {
					runAction({ command: 'branchFromStash', repo: currentRepo, selector: selector, branchName: branchName }, 'Creating Branch');
				}, target);
			}
		}, {
			title: 'Pop Stash' + ELLIPSIS,
			visible: visibility.pop,
			onClick: () => {
				dialog.showForm('Are you sure you want to pop the stash <b><i>' + escapeHtml(selector.substring(5)) + '</i></b>?', [{
					type: DialogInputType.Checkbox,
					name: 'Reinstate Index',
					value: config.dialogDefaults.popStash.reinstateIndex,
					info: 'Attempt to reinstate the indexed changes, in addition to the working tree\'s changes.'
				}], 'Yes, pop stash', (values) => {
					runAction({ command: 'popStash', repo: currentRepo, selector: selector, reinstateIndex: <boolean>values[0] }, 'Popping Stash');
				}, target);
			}
		}, {
			title: 'Drop Stash' + ELLIPSIS,
			visible: visibility.drop,
			onClick: () => {
				dialog.showConfirmation('Are you sure you want to drop the stash <b><i>' + escapeHtml(selector.substring(5)) + '</i></b>?', 'Yes, drop', () => {
					runAction({ command: 'dropStash', repo: currentRepo, selector: selector }, 'Dropping Stash');
				}, target);
			}
		}
	], [
		{
			title: 'Copy Stash Name to Clipboard',
			visible: visibility.copyName,
			onClick: () => {
				sendMessage({ command: 'copyToClipboard', type: 'Stash Name', data: selector });
			}
		}, {
			title: 'Copy Stash Hash to Clipboard',
			visible: visibility.copyHash,
			onClick: () => {
				sendMessage({ command: 'copyToClipboard', type: 'Stash Hash', data: hash });
			}
		}
	]];
}

function buildTagContextMenuActions(view: GitGraphView, isAnnotated: boolean, target: DialogTarget & RefTarget): ContextMenuActions {
	const hash = target.hash, tagName = target.ref, visibility = view.getConfig().contextMenuActionsVisibility.tag;
	const currentRepo = view.getCurrentRepo();
	const gitRemotes = view.getGitRemotes();
	return [[
		{
			title: 'View Details',
			visible: visibility.viewDetails && isAnnotated,
			onClick: () => {
				runAction({ command: 'tagDetails', repo: currentRepo, tagName: tagName, commitHash: hash }, 'Retrieving Tag Details');
			}
		}, {
			title: 'Delete Tag' + ELLIPSIS,
			visible: visibility.delete,
			onClick: () => {
				let message = 'Are you sure you want to delete the tag <b><i>' + escapeHtml(tagName) + '</i></b>?';
				if (gitRemotes.length > 1) {
					let options = [{ name: 'Don\'t delete on any remote', value: '-1' }];
					gitRemotes.forEach((remote, i) => options.push({ name: remote, value: i.toString() }));
					dialog.showSelect(message + '<br>Do you also want to delete the tag on a remote:', '-1', options, 'Yes, delete', remoteIndex => {
						deleteTagAction(view, tagName, remoteIndex !== '-1' ? gitRemotes[parseInt(remoteIndex)] : null);
					}, target);
				} else if (gitRemotes.length === 1) {
					dialog.showCheckbox(message, 'Also delete on remote', false, 'Yes, delete', deleteOnRemote => {
						deleteTagAction(view, tagName, deleteOnRemote ? gitRemotes[0] : null);
					}, target);
				} else {
					dialog.showConfirmation(message, 'Yes, delete', () => {
						deleteTagAction(view, tagName, null);
					}, target);
				}
			}
		}, {
			title: 'Push Tag' + ELLIPSIS,
			visible: visibility.push && gitRemotes.length > 0,
			onClick: () => {
				const runPushTagAction = (remotes: string[]) => {
					runAction({
						command: 'pushTag',
						repo: currentRepo,
						tagName: tagName,
						remotes: remotes,
						commitHash: hash,
						skipRemoteCheck: globalState.pushTagSkipRemoteCheck
					}, 'Pushing Tag');
				};

				if (gitRemotes.length === 1) {
					dialog.showConfirmation('Are you sure you want to push the tag <b><i>' + escapeHtml(tagName) + '</i></b> to the remote <b><i>' + escapeHtml(gitRemotes[0]) + '</i></b>?', 'Yes, push', () => {
						runPushTagAction([gitRemotes[0]]);
					}, target);
				} else if (gitRemotes.length > 1) {
					const defaults = [view.getPushRemote()];
					const options = gitRemotes.map((remote) => ({ name: remote, value: remote }));
					dialog.showMultiSelect('Are you sure you want to push the tag <b><i>' + escapeHtml(tagName) + '</i></b>? Select the remote(s) to push the tag to:', defaults, options, 'Yes, push', (remotes) => {
						runPushTagAction(remotes);
					}, target);
				}
			}
		}
	], [
		{
			title: 'Create Archive',
			visible: visibility.createArchive,
			onClick: () => {
				runAction({ command: 'createArchive', repo: currentRepo, ref: tagName }, 'Creating Archive');
			}
		},
		{
			title: 'Copy Tag Name to Clipboard',
			visible: visibility.copyName,
			onClick: () => {
				sendMessage({ command: 'copyToClipboard', type: 'Tag Name', data: tagName });
			}
		}
	]];
}

function buildUncommittedChangesContextMenuActions(view: GitGraphView, target: DialogTarget & CommitTarget): ContextMenuActions {
	let visibility = view.getConfig().contextMenuActionsVisibility.uncommittedChanges;
	const currentRepo = view.getCurrentRepo();
	const config = view.getConfig();
	return [[
		{
			title: 'Stash uncommitted changes' + ELLIPSIS,
			visible: visibility.stash,
			onClick: () => {
				dialog.showForm('Are you sure you want to stash the <b>uncommitted changes</b>?', [
					{ type: DialogInputType.Text, name: 'Message', default: '', placeholder: 'Optional' },
					{ type: DialogInputType.Checkbox, name: 'Include Untracked', value: config.dialogDefaults.stashUncommittedChanges.includeUntracked, info: 'Include all untracked files in the stash, and then clean them from the working directory.' }
				], 'Yes, stash', (values) => {
					runAction({ command: 'pushStash', repo: currentRepo, message: <string>values[0], includeUntracked: <boolean>values[1] }, 'Stashing uncommitted changes');
				}, target);
			}
		}
	], [
		{
			title: 'Reset uncommitted changes' + ELLIPSIS,
			visible: visibility.reset,
			onClick: () => {
				dialog.showSelect('Are you sure you want to reset the <b>uncommitted changes</b> to <b>HEAD</b>?', config.dialogDefaults.resetUncommitted.mode, [
					{ name: 'Mixed - Keep working tree, but reset index', value: GG.GitResetMode.Mixed },
					{ name: 'Hard - Discard all changes', value: GG.GitResetMode.Hard }
				], 'Yes, reset', (mode) => {
					runAction({ command: 'resetToCommit', repo: currentRepo, commit: 'HEAD', resetMode: <GG.GitResetMode>mode }, 'Resetting uncommitted changes');
				}, target);
			}
		}, {
			title: 'Clean untracked files' + ELLIPSIS,
			visible: visibility.clean,
			onClick: () => {
				dialog.showCheckbox('Are you sure you want to clean all untracked files?', 'Clean untracked directories', true, 'Yes, clean', directories => {
					runAction({ command: 'cleanUntrackedFiles', repo: currentRepo, directories: directories }, 'Cleaning untracked files');
				}, target);
			}
		}
	], [
		{
			title: 'Open Source Control View',
			visible: visibility.openSourceControlView,
			onClick: () => {
				sendMessage({ command: 'viewScm' });
			}
		}
	]];
}

function buildViewIssueAction(view: GitGraphView, refName: string, visible: boolean, target: DialogTarget & RefTarget): ContextMenuAction {
	const issueLinks: { url: string, displayText: string }[] = [];
	const gitRepos = view.getGitRepos();
	const currentRepo = view.getCurrentRepo();

	let issueLinking: IssueLinking | null, match: RegExpExecArray | null;
	if (visible && (issueLinking = parseIssueLinkingConfig(gitRepos[currentRepo].issueLinkingConfig)) !== null) {
		issueLinking.regexp.lastIndex = 0;
		while (match = issueLinking.regexp.exec(refName)) {
			if (match[0].length === 0) break;
			issueLinks.push({
				url: generateIssueLinkFromMatch(match, issueLinking),
				displayText: match[0]
			});
		}
	}

	return {
		title: 'View Issue' + (issueLinks.length > 1 ? ELLIPSIS : ''),
		visible: issueLinks.length > 0,
		onClick: () => {
			if (issueLinks.length > 1) {
				dialog.showSelect('Select which issue you want to view for this branch:', '0', issueLinks.map((issueLink, i) => ({ name: issueLink.displayText, value: i.toString() })), 'View Issue', (value) => {
					sendMessage({ command: 'openExternalUrl', url: issueLinks[parseInt(value)].url });
				}, target);
			} else if (issueLinks.length === 1) {
				sendMessage({ command: 'openExternalUrl', url: issueLinks[0].url });
			}
		}
	};
}


/* Actions */

function addTagAction(view: GitGraphView, hash: string, initialName: string, initialType: GG.TagType, initialMessage: string, initialPushToRemote: string | null, target: DialogTarget & CommitTarget, isInitialLoad: boolean = true) {
	const commits = view.getCommits();
	const gitRemotes = view.getGitRemotes();
	const gitTags = view.getGitTags();
	const currentRepo = view.getCurrentRepo();
	const config = view.getConfig();

	let mostRecentTagsIndex = -1;
	for (let i = 0; i < commits.length; i++) {
		if (commits[i].tags.length > 0 && (mostRecentTagsIndex === -1 || commits[i].date > commits[mostRecentTagsIndex].date)) {
			mostRecentTagsIndex = i;
		}
	}
	const mostRecentTags = mostRecentTagsIndex > -1 ? commits[mostRecentTagsIndex].tags.map((tag) => '"' + tag.name + '"') : [];

	const inputs: DialogInput[] = [
		{ type: DialogInputType.TextRef, name: 'Name', default: initialName, info: mostRecentTags.length > 0 ? 'The most recent tag' + (mostRecentTags.length > 1 ? 's' : '') + ' in the loaded commits ' + (mostRecentTags.length > 1 ? 'are' : 'is') + ' ' + formatCommaSeparatedList(mostRecentTags) + '.' : undefined },
		{ type: DialogInputType.Select, name: 'Type', default: initialType === GG.TagType.Annotated ? 'annotated' : 'lightweight', options: [{ name: 'Annotated', value: 'annotated' }, { name: 'Lightweight', value: 'lightweight' }] },
		{ type: DialogInputType.Text, name: 'Message', default: initialMessage, placeholder: 'Optional', info: 'A message can only be added to an annotated tag.' }
	];
	if (gitRemotes.length > 1) {
		const options = [{ name: 'Don\'t push', value: '-1' }];
		gitRemotes.forEach((remote, i) => options.push({ name: remote, value: i.toString() }));
		const defaultOption = initialPushToRemote !== null
			? gitRemotes.indexOf(initialPushToRemote)
			: isInitialLoad && config.dialogDefaults.addTag.pushToRemote
				? gitRemotes.indexOf(view.getPushRemote())
				: -1;
		inputs.push({ type: DialogInputType.Select, name: 'Push to remote', options: options, default: defaultOption.toString(), info: 'Once this tag has been added, push it to this remote.' });
	} else if (gitRemotes.length === 1) {
		const defaultValue = initialPushToRemote !== null || (isInitialLoad && config.dialogDefaults.addTag.pushToRemote);
		inputs.push({ type: DialogInputType.Checkbox, name: 'Push to remote', value: defaultValue, info: 'Once this tag has been added, push it to the repositories remote.' });
	}

	dialog.showForm('Add tag to commit <b><i>' + abbrevCommit(hash) + '</i></b>:', inputs, 'Add Tag', (values) => {
		const tagName = <string>values[0];
		const type = <string>values[1] === 'annotated' ? GG.TagType.Annotated : GG.TagType.Lightweight;
		const message = <string>values[2];
		const pushToRemote = gitRemotes.length > 1 && <string>values[3] !== '-1'
			? gitRemotes[parseInt(<string>values[3])]
			: gitRemotes.length === 1 && <boolean>values[3]
				? gitRemotes[0]
				: null;

		const runAddTagAction = (force: boolean) => {
			runAction({
				command: 'addTag',
				repo: currentRepo,
				tagName: tagName,
				commitHash: hash,
				type: type,
				message: message,
				pushToRemote: pushToRemote,
				pushSkipRemoteCheck: globalState.pushTagSkipRemoteCheck,
				force: force
			}, 'Adding Tag');
		};

		if (gitTags.includes(tagName)) {
			dialog.showTwoButtons('A tag named <b><i>' + escapeHtml(tagName) + '</i></b> already exists, do you want to replace it with this new tag?', 'Yes, replace the existing tag', () => {
				runAddTagAction(true);
			}, 'No, choose another tag name', () => {
				addTagAction(view, hash, tagName, type, message, pushToRemote, target, false);
			}, target);
		} else {
			runAddTagAction(false);
		}
	}, target);
}

function checkoutBranchAction(view: GitGraphView, refName: string, remote: string | null, prefillName: string | null, target: DialogTarget & (CommitTarget | RefTarget)) {
	const gitBranches = view.getBranches();
	const currentRepo = view.getCurrentRepo();
	const config = view.getConfig();
	if (remote !== null) {
		dialog.showRefInput('Enter the name of the new branch you would like to create when checking out <b><i>' + escapeHtml(refName) + '</i></b>:', (prefillName !== null ? prefillName : (remote !== '' ? refName.substring(remote.length + 1) : refName)), 'Checkout Branch', newBranch => {
			if (gitBranches.includes(newBranch)) {
				const canPullFromRemote = remote !== '';
				dialog.showTwoButtons('The name <b><i>' + escapeHtml(newBranch) + '</i></b> is already used by another branch:', 'Choose another branch name', () => {
					checkoutBranchAction(view, refName, remote, newBranch, target);
				}, 'Checkout the existing branch' + (canPullFromRemote ? ' & pull changes' : ''), () => {
					runAction({
						command: 'checkoutBranch',
						repo: currentRepo,
						branchName: newBranch,
						remoteBranch: null,
						pullAfterwards: canPullFromRemote
							? {
								branchName: refName.substring(remote.length + 1),
								remote: remote,
								createNewCommit: config.dialogDefaults.pullBranch.noFastForward,
								squash: config.dialogDefaults.pullBranch.squash
							}
							: null
					}, 'Checking out Branch' + (canPullFromRemote ? ' & Pulling Changes' : ''));
				}, target);
			} else {
				runAction({ command: 'checkoutBranch', repo: currentRepo, branchName: newBranch, remoteBranch: refName, pullAfterwards: null }, 'Checking out Branch');
			}
		}, target);
	} else {
		runAction({ command: 'checkoutBranch', repo: currentRepo, branchName: refName, remoteBranch: null, pullAfterwards: null }, 'Checking out Branch');
	}
}

function createBranchAction(view: GitGraphView, hash: string, initialName: string, initialCheckOut: boolean, target: DialogTarget & CommitTarget) {
	const gitBranches = view.getBranches();
	const currentRepo = view.getCurrentRepo();
	dialog.showForm('Create branch at commit <b><i>' + abbrevCommit(hash) + '</i></b>:', [
		{ type: DialogInputType.TextRef, name: 'Name', default: initialName },
		{ type: DialogInputType.Checkbox, name: 'Check out', value: initialCheckOut }
	], 'Create Branch', (values) => {
		const branchName = <string>values[0], checkOut = <boolean>values[1];
		if (gitBranches.includes(branchName)) {
			dialog.showTwoButtons('A branch named <b><i>' + escapeHtml(branchName) + '</i></b> already exists, do you want to replace it with this new branch?', 'Yes, replace the existing branch', () => {
				runAction({ command: 'createBranch', repo: currentRepo, branchName: branchName, commitHash: hash, checkout: checkOut, force: true }, 'Creating Branch');
			}, 'No, choose another branch name', () => {
				createBranchAction(view, hash, branchName, checkOut, target);
			}, target);
		} else {
			runAction({ command: 'createBranch', repo: currentRepo, branchName: branchName, commitHash: hash, checkout: checkOut, force: false }, 'Creating Branch');
		}
	}, target);
}

function deleteTagAction(view: GitGraphView, refName: string, deleteOnRemote: string | null) {
	runAction({ command: 'deleteTag', repo: view.getCurrentRepo(), tagName: refName, deleteOnRemote: deleteOnRemote }, 'Deleting Tag');
}

function fetchFromRemotesAction(view: GitGraphView) {
	const config = view.getConfig();
	runAction({ command: 'fetch', repo: view.getCurrentRepo(), name: null, prune: config.fetchAndPrune, pruneTags: config.fetchAndPruneTags }, 'Fetching from Remote(s)');
}

function mergeAction(view: GitGraphView, obj: string, name: string, actionOn: GG.MergeActionOn, target: DialogTarget & (CommitTarget | RefTarget)) {
	const gitBranchHead = view.getGitBranchHead();
	const currentRepo = view.getCurrentRepo();
	const config = view.getConfig();
	dialog.showForm('Are you sure you want to merge ' + actionOn.toLowerCase() + ' <b><i>' + escapeHtml(name) + '</i></b> into ' + (gitBranchHead !== null ? '<b><i>' + escapeHtml(gitBranchHead) + '</i></b> (the current branch)' : 'the current branch') + '?', [
		{ type: DialogInputType.Checkbox, name: 'Create a new commit even if fast-forward is possible', value: config.dialogDefaults.merge.noFastForward },
		{ type: DialogInputType.Checkbox, name: 'Squash Commits', value: config.dialogDefaults.merge.squash, info: 'Create a single commit on the current branch whose effect is the same as merging this ' + actionOn.toLowerCase() + '.' },
		{ type: DialogInputType.Checkbox, name: 'No Commit', value: config.dialogDefaults.merge.noCommit, info: 'The changes of the merge will be staged but not committed, so that you can review and/or modify the merge result before committing.' }
	], 'Yes, merge', (values) => {
		runAction({ command: 'merge', repo: currentRepo, obj: obj, actionOn: actionOn, createNewCommit: <boolean>values[0], squash: <boolean>values[1], noCommit: <boolean>values[2] }, 'Merging ' + actionOn);
	}, target);
}

function rebaseAction(view: GitGraphView, obj: string, name: string, actionOn: GG.RebaseActionOn, target: DialogTarget & (CommitTarget | RefTarget)) {
	const gitBranchHead = view.getGitBranchHead();
	const currentRepo = view.getCurrentRepo();
	const config = view.getConfig();
	dialog.showForm('Are you sure you want to rebase ' + (gitBranchHead !== null ? '<b><i>' + escapeHtml(gitBranchHead) + '</i></b> (the current branch)' : 'the current branch') + ' on ' + actionOn.toLowerCase() + ' <b><i>' + escapeHtml(name) + '</i></b>?', [
		{ type: DialogInputType.Checkbox, name: 'Launch Interactive Rebase in new Terminal', value: config.dialogDefaults.rebase.interactive },
		{ type: DialogInputType.Checkbox, name: 'Ignore Date', value: config.dialogDefaults.rebase.ignoreDate, info: 'Only applicable to a non-interactive rebase.' }
	], 'Yes, rebase', (values) => {
		let interactive = <boolean>values[0];
		runAction({ command: 'rebase', repo: currentRepo, obj: obj, actionOn: actionOn, ignoreDate: <boolean>values[1], interactive: interactive }, interactive ? 'Launching Interactive Rebase' : 'Rebasing on ' + actionOn);
	}, target);
}
