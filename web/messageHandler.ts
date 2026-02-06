function handleMessage(gitGraph: GitGraphView, imageResizer: ImageResizer, msg: GG.ResponseMessage) {

	function handleResponseDeleteBranch(msg: GG.ResponseDeleteBranch) {
		if (msg.errors.length > 0 && msg.errors[0] !== null && msg.errors[0].includes('git branch -D')) {
			dialog.showConfirmation('The branch <b><i>' + escapeHtml(msg.branchName) + '</i></b> is not fully merged. Would you like to force delete it?', 'Yes, force delete branch', () => {
				runAction({ command: 'deleteBranch', repo: msg.repo, branchName: msg.branchName, forceDelete: true, deleteOnRemotes: msg.deleteOnRemotes }, 'Deleting Branch');
			}, { type: TargetType.Repo });
		} else {
			refreshAndDisplayErrors(msg.errors, 'Unable to Delete Branch');
		}
	}

	function handleResponsePushTagCommitNotOnRemote(repo: string, tagName: string, remotes: string[], commitHash: string, error: string) {
		const remotesNotContainingCommit: string[] = parseExtensionErrorInfo(error, GG.ErrorInfoExtensionPrefix.PushTagCommitNotOnRemote);

		const html = '<span class="dialogAlert">' + SVG_ICONS.alert + 'Warning: Commit is not on Remote' + (remotesNotContainingCommit.length > 1 ? 's ' : ' ') + '</span><br>' +
			'<span class="messageContent">' +
			'<p style="margin:0 0 6px 0;">The tag <b><i>' + escapeHtml(tagName) + '</i></b> is on a commit that isn\'t on any known branch on the remote' + (remotesNotContainingCommit.length > 1 ? 's' : '') + ' ' + formatCommaSeparatedList(remotesNotContainingCommit.map((remote) => '<b><i>' + escapeHtml(remote) + '</i></b>')) + '.</p>' +
			'<p style="margin:0;">Would you like to proceed to push the tag to the remote' + (remotes.length > 1 ? 's' : '') + ' ' + formatCommaSeparatedList(remotes.map((remote) => '<b><i>' + escapeHtml(remote) + '</i></b>')) + ' anyway?</p>' +
			'</span>';

		dialog.showForm(html, [{ type: DialogInputType.Checkbox, name: 'Always Proceed', value: false }], 'Proceed to Push', (values) => {
			if (<boolean>values[0]) {
				updateGlobalViewState('pushTagSkipRemoteCheck', true);
			}
			runAction({
				command: 'pushTag',
				repo: repo,
				tagName: tagName,
				remotes: remotes,
				commitHash: commitHash,
				skipRemoteCheck: true
			}, 'Pushing Tag');
		}, { type: TargetType.Repo }, 'Cancel', null, true);
	}

	function refreshOrDisplayError(error: GG.ErrorInfo, errorMessage: string, configChanges: boolean = false) {
		if (error === null) {
			gitGraph.refresh(false, configChanges);
		} else {
			dialog.showError(errorMessage, error, null, null);
		}
	}

	function refreshAndDisplayErrors(errors: GG.ErrorInfo[], errorMessage: string, configChanges: boolean = false) {
		const reducedErrors = reduceErrorInfos(errors);
		if (reducedErrors.error !== null) {
			dialog.showError(errorMessage, reducedErrors.error, null, null);
		}
		if (reducedErrors.partialOrCompleteSuccess) {
			gitGraph.refresh(false, configChanges);
		} else if (configChanges) {
			gitGraph.requestLoadConfig();
		}
	}

	function finishOrDisplayError(error: GG.ErrorInfo, errorMessage: string, dismissActionRunning: boolean = false) {
		if (error !== null) {
			dialog.showError(errorMessage, error, null, null);
		} else if (dismissActionRunning) {
			dialog.closeActionRunning();
		}
	}

	function finishOrDisplayErrors(errors: GG.ErrorInfo[], errorMessage: string, partialOrCompleteSuccessCallback: () => void, dismissActionRunning: boolean = false) {
		const reducedErrors = reduceErrorInfos(errors);
		finishOrDisplayError(reducedErrors.error, errorMessage, dismissActionRunning);
		if (reducedErrors.partialOrCompleteSuccess) {
			partialOrCompleteSuccessCallback();
		}
	}

	function reduceErrorInfos(errors: GG.ErrorInfo[]) {
		let error: GG.ErrorInfo = null, partialOrCompleteSuccess = false;
		for (let i = 0; i < errors.length; i++) {
			if (errors[i] !== null) {
				error = error !== null ? error + '\n\n' + errors[i] : errors[i];
			} else {
				partialOrCompleteSuccess = true;
			}
		}

		return {
			error: error,
			partialOrCompleteSuccess: partialOrCompleteSuccess
		};
	}

	function isExtensionErrorInfo(error: GG.ErrorInfo, prefix: GG.ErrorInfoExtensionPrefix) {
		return error !== null && error.startsWith(prefix);
	}

	function parseExtensionErrorInfo(error: string, prefix: GG.ErrorInfoExtensionPrefix) {
		return JSON.parse(error.substring(prefix.length));
	}

	switch (msg.command) {
		case 'addRemote':
			refreshOrDisplayError(msg.error, 'Unable to Add Remote', true);
			break;
		case 'addTag':
			if (msg.pushToRemote !== null && msg.errors.length === 2 && msg.errors[0] === null && isExtensionErrorInfo(msg.errors[1], GG.ErrorInfoExtensionPrefix.PushTagCommitNotOnRemote)) {
				gitGraph.refresh(false);
				handleResponsePushTagCommitNotOnRemote(msg.repo, msg.tagName, [msg.pushToRemote], msg.commitHash, msg.errors[1]!);
			} else {
				refreshAndDisplayErrors(msg.errors, 'Unable to Add Tag');
			}
			break;
		case 'applyStash':
			refreshOrDisplayError(msg.error, 'Unable to Apply Stash');
			break;
		case 'branchFromStash':
			refreshOrDisplayError(msg.error, 'Unable to Create Branch from Stash');
			break;
		case 'checkoutBranch':
			refreshAndDisplayErrors(msg.errors, 'Unable to Checkout Branch' + (msg.pullAfterwards !== null ? ' & Pull Changes' : ''));
			break;
		case 'checkoutCommit':
			refreshOrDisplayError(msg.error, 'Unable to Checkout Commit');
			break;
		case 'cherrypickCommit':
			refreshAndDisplayErrors(msg.errors, 'Unable to Cherry Pick Commit');
			break;
		case 'cleanUntrackedFiles':
			refreshOrDisplayError(msg.error, 'Unable to Clean Untracked Files');
			break;
		case 'commitDetails':
			if (msg.commitDetails !== null) {
				gitGraph.showCommitDetails(msg.commitDetails, gitGraph.createFileTree(msg.commitDetails.fileChanges, msg.codeReview), msg.avatar, msg.codeReview, msg.codeReview !== null ? msg.codeReview.lastViewedFile : null, msg.refresh);
			} else {
				gitGraph.closeCommitDetails(true);
				dialog.showError('Unable to load Commit Details', msg.error, null, null);
			}
			break;
		case 'compareCommits':
			if (msg.error === null) {
				gitGraph.showCommitComparison(msg.commitHash, msg.compareWithHash, msg.fileChanges, gitGraph.createFileTree(msg.fileChanges, msg.codeReview), msg.codeReview, msg.codeReview !== null ? msg.codeReview.lastViewedFile : null, msg.refresh);
			} else {
				gitGraph.closeCommitComparison(true);
				dialog.showError('Unable to load Commit Comparison', msg.error, null, null);
			}
			break;
		case 'copyFilePath':
			finishOrDisplayError(msg.error, 'Unable to Copy File Path to Clipboard');
			break;
		case 'copyToClipboard':
			finishOrDisplayError(msg.error, 'Unable to Copy ' + msg.type + ' to Clipboard');
			break;
		case 'createArchive':
			finishOrDisplayError(msg.error, 'Unable to Create Archive', true);
			break;
		case 'createBranch':
			refreshAndDisplayErrors(msg.errors, 'Unable to Create Branch');
			break;
		case 'createPullRequest':
			finishOrDisplayErrors(msg.errors, 'Unable to Create Pull Request', () => {
				if (msg.push) {
					gitGraph.refresh(false);
				}
			}, true);
			break;
		case 'deleteBranch':
			handleResponseDeleteBranch(msg);
			break;
		case 'deleteRemote':
			refreshOrDisplayError(msg.error, 'Unable to Delete Remote', true);
			break;
		case 'deleteRemoteBranch':
			refreshOrDisplayError(msg.error, 'Unable to Delete Remote Branch');
			break;
		case 'deleteTag':
			refreshOrDisplayError(msg.error, 'Unable to Delete Tag');
			break;
		case 'deleteUserDetails':
			finishOrDisplayErrors(msg.errors, 'Unable to Remove Git User Details', () => gitGraph.requestLoadConfig(), true);
			break;
		case 'dropCommit':
			refreshOrDisplayError(msg.error, 'Unable to Drop Commit');
			break;
		case 'dropStash':
			refreshOrDisplayError(msg.error, 'Unable to Drop Stash');
			break;
		case 'editRemote':
			refreshOrDisplayError(msg.error, 'Unable to Save Changes to Remote', true);
			break;
		case 'editUserDetails':
			finishOrDisplayErrors(msg.errors, 'Unable to Save Git User Details', () => gitGraph.requestLoadConfig(), true);
			break;
		case 'exportRepoConfig':
			refreshOrDisplayError(msg.error, 'Unable to Export Repository Configuration');
			break;
		case 'fetch':
			refreshOrDisplayError(msg.error, 'Unable to Fetch from Remote(s)');
			break;
		case 'fetchAvatar':
			imageResizer.resize(msg.image, (resizedImage) => {
				gitGraph.loadAvatar(msg.email, resizedImage);
			});
			break;
		case 'fetchIntoLocalBranch':
			refreshOrDisplayError(msg.error, 'Unable to Fetch into Local Branch');
			break;
		case 'loadCommits':
			gitGraph.processLoadCommitsResponse(msg);
			break;
		case 'loadConfig':
			gitGraph.processLoadConfig(msg);
			break;
		case 'loadRepoInfo':
			gitGraph.processLoadRepoInfoResponse(msg);
			break;
		case 'loadRepos':
			gitGraph.loadRepos(msg.repos, msg.lastActiveRepo, msg.loadViewTo);
			break;
		case 'merge':
			refreshOrDisplayError(msg.error, 'Unable to Merge ' + msg.actionOn);
			break;
		case 'openExtensionSettings':
			finishOrDisplayError(msg.error, 'Unable to Open Extension Settings');
			break;
		case 'openExternalDirDiff':
			finishOrDisplayError(msg.error, 'Unable to Open External Directory Diff', true);
			break;
		case 'openExternalUrl':
			finishOrDisplayError(msg.error, 'Unable to Open External URL');
			break;
		case 'openFile':
			finishOrDisplayError(msg.error, 'Unable to Open File');
			break;
		case 'openTerminal':
			finishOrDisplayError(msg.error, 'Unable to Open Terminal', true);
			break;
		case 'popStash':
			refreshOrDisplayError(msg.error, 'Unable to Pop Stash');
			break;
		case 'pruneRemote':
			refreshOrDisplayError(msg.error, 'Unable to Prune Remote');
			break;
		case 'pullBranch':
			refreshOrDisplayError(msg.error, 'Unable to Pull Branch');
			break;
		case 'pushBranch':
			refreshAndDisplayErrors(msg.errors, 'Unable to Push Branch', msg.willUpdateBranchConfig);
			break;
		case 'pushStash':
			refreshOrDisplayError(msg.error, 'Unable to Stash Uncommitted Changes');
			break;
		case 'pushTag':
			if (msg.errors.length === 1 && isExtensionErrorInfo(msg.errors[0], GG.ErrorInfoExtensionPrefix.PushTagCommitNotOnRemote)) {
				handleResponsePushTagCommitNotOnRemote(msg.repo, msg.tagName, msg.remotes, msg.commitHash, msg.errors[0]!);
			} else {
				refreshAndDisplayErrors(msg.errors, 'Unable to Push Tag');
			}
			break;
		case 'rebase':
			if (msg.error === null) {
				if (msg.interactive) {
					dialog.closeActionRunning();
				} else {
					gitGraph.refresh(false);
				}
			} else {
				dialog.showError('Unable to Rebase current branch on ' + msg.actionOn, msg.error, null, null);
			}
			break;
		case 'refresh':
			gitGraph.refresh(false);
			break;
		case 'renameBranch':
			refreshOrDisplayError(msg.error, 'Unable to Rename Branch');
			break;
		case 'resetFileToRevision':
			refreshOrDisplayError(msg.error, 'Unable to Reset File to Revision');
			break;
		case 'resetToCommit':
			refreshOrDisplayError(msg.error, 'Unable to Reset to Commit');
			break;
		case 'revertCommit':
			refreshOrDisplayError(msg.error, 'Unable to Revert Commit');
			break;
		case 'setGlobalViewState':
			finishOrDisplayError(msg.error, 'Unable to save the Global View State');
			break;
		case 'setWorkspaceViewState':
			finishOrDisplayError(msg.error, 'Unable to save the Workspace View State');
			break;
		case 'startCodeReview':
			if (msg.error === null) {
				gitGraph.startCodeReview(msg.commitHash, msg.compareWithHash, msg.codeReview);
			} else {
				dialog.showError('Unable to Start Code Review', msg.error, null, null);
			}
			break;
		case 'tagDetails':
			if (msg.details !== null) {
				gitGraph.renderTagDetails(msg.tagName, msg.commitHash, msg.details);
			} else {
				dialog.showError('Unable to retrieve Tag Details', msg.error, null, null);
			}
			break;
		case 'updateCodeReview':
			if (msg.error !== null) {
				dialog.showError('Unable to update Code Review', msg.error, null, null);
			}
			break;
		case 'viewDiff':
			finishOrDisplayError(msg.error, 'Unable to View Diff');
			break;
		case 'viewDiffWithWorkingFile':
			finishOrDisplayError(msg.error, 'Unable to View Diff with Working File');
			break;
		case 'viewFileAtRevision':
			finishOrDisplayError(msg.error, 'Unable to View File at Revision');
			break;
		case 'viewScm':
			finishOrDisplayError(msg.error, 'Unable to open the Source Control View');
			break;
	}
}
