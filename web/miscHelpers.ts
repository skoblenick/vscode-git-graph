/* Miscellaneous Helper Methods */

function haveFilesChanged(
  oldFiles: ReadonlyArray<GG.GitFileChange> | null,
  newFiles: ReadonlyArray<GG.GitFileChange> | null
) {
  if ((oldFiles === null) !== (newFiles === null)) {
    return true;
  } else if (oldFiles === null && newFiles === null) {
    return false;
  } else {
    return !arraysEqual(
      oldFiles!,
      newFiles!,
      (a, b) =>
        a.additions === b.additions &&
        a.deletions === b.deletions &&
        a.newFilePath === b.newFilePath &&
        a.oldFilePath === b.oldFilePath &&
        a.type === b.type
    );
  }
}

function abbrevCommit(commitHash: string) {
  return commitHash.substring(0, 8);
}

function getRepoDropdownOptions(repos: Readonly<GG.GitRepoSet>) {
  const repoPaths = getSortedRepositoryPaths(repos, initialState.config.repoDropdownOrder);
  const paths: string[] = [],
    names: string[] = [],
    distinctNames: string[] = [],
    firstSep: number[] = [];
  const resolveAmbiguous = (indexes: number[]) => {
    // Find ambiguous names within indexes
    let firstOccurrence: { [name: string]: number } = {},
      ambiguous: { [name: string]: number[] } = {};
    for (let i = 0; i < indexes.length; i++) {
      let name = distinctNames[indexes[i]];
      if (typeof firstOccurrence[name] === 'number') {
        // name is ambiguous
        if (typeof ambiguous[name] === 'undefined') {
          // initialise ambiguous array with the first occurrence
          ambiguous[name] = [firstOccurrence[name]];
        }
        ambiguous[name].push(indexes[i]); // append current ambiguous index
      } else {
        firstOccurrence[name] = indexes[i]; // set the first occurrence of the name
      }
    }

    let ambiguousNames = Object.keys(ambiguous);
    for (let i = 0; i < ambiguousNames.length; i++) {
      // For each ambiguous name, resolve the ambiguous indexes
      let ambiguousIndexes = ambiguous[ambiguousNames[i]],
        retestIndexes = [];
      for (let j = 0; j < ambiguousIndexes.length; j++) {
        let ambiguousIndex = ambiguousIndexes[j];
        let nextSep = paths[ambiguousIndex].lastIndexOf(
          '/',
          paths[ambiguousIndex].length - distinctNames[ambiguousIndex].length - 2
        );
        if (firstSep[ambiguousIndex] < nextSep) {
          // prepend the addition path and retest
          distinctNames[ambiguousIndex] = paths[ambiguousIndex].substring(nextSep + 1);
          retestIndexes.push(ambiguousIndex);
        } else {
          distinctNames[ambiguousIndex] = paths[ambiguousIndex];
        }
      }
      if (retestIndexes.length > 1) {
        // If there are 2 or more indexes that may be ambiguous
        resolveAmbiguous(retestIndexes);
      }
    }
  };

  // Initialise recursion
  const indexes = [];
  for (let i = 0; i < repoPaths.length; i++) {
    firstSep.push(repoPaths[i].indexOf('/'));
    const repo = repos[repoPaths[i]];
    if (repo.name) {
      // A name has been set for the repository
      paths.push(repoPaths[i]);
      names.push(repo.name);
      distinctNames.push(repo.name);
    } else if (firstSep[i] === repoPaths[i].length - 1 || firstSep[i] === -1) {
      // Path has no slashes, or a single trailing slash ==> use the path as the name
      paths.push(repoPaths[i]);
      names.push(repoPaths[i]);
      distinctNames.push(repoPaths[i]);
    } else {
      paths.push(
        repoPaths[i].endsWith('/')
          ? repoPaths[i].substring(0, repoPaths[i].length - 1)
          : repoPaths[i]
      ); // Remove trailing slash if it exists
      let name = paths[i].substring(paths[i].lastIndexOf('/') + 1);
      names.push(name);
      distinctNames.push(name);
      indexes.push(i);
    }
  }
  resolveAmbiguous(indexes);

  const options: DropdownOption[] = [];
  for (let i = 0; i < repoPaths.length; i++) {
    let hint;
    if (names[i] === distinctNames[i]) {
      // Name is distinct, no hint needed
      hint = '';
    } else {
      // Hint path is the prefix of the distinctName before the common suffix with name
      let hintPath = distinctNames[i].substring(0, distinctNames[i].length - names[i].length - 1);

      // Keep two informative directories
      let hintComps = hintPath.split('/');
      let keepDirs = hintComps[0] !== '' ? 2 : 3;
      if (hintComps.length > keepDirs)
        hintComps.splice(keepDirs, hintComps.length - keepDirs, '...');

      // Construct the hint
      hint = (distinctNames[i] !== paths[i] ? '.../' : '') + hintComps.join('/');
    }
    options.push({ name: names[i], value: repoPaths[i], hint: hint });
  }
  return options;
}

function runAction(msg: GG.RequestMessage, action: string) {
  dialog.showActionRunning(action);
  sendMessage(msg);
}

function getBranchLabels(heads: ReadonlyArray<string>, remotes: ReadonlyArray<GG.GitCommitRemote>) {
  let headLabels: { name: string; remotes: string[] }[] = [],
    headLookup: { [name: string]: number } = {},
    remoteLabels: ReadonlyArray<GG.GitCommitRemote>;
  for (let i = 0; i < heads.length; i++) {
    headLabels.push({ name: heads[i], remotes: [] });
    headLookup[heads[i]] = i;
  }
  if (initialState.config.referenceLabels.combineLocalAndRemoteBranchLabels) {
    let remainingRemoteLabels = [];
    for (let i = 0; i < remotes.length; i++) {
      if (remotes[i].remote !== null) {
        // If the remote of the remote branch ref is known
        let branchName = remotes[i].name.substring(remotes[i].remote!.length + 1);
        if (typeof headLookup[branchName] === 'number') {
          headLabels[headLookup[branchName]].remotes.push(remotes[i].remote!);
          continue;
        }
      }
      remainingRemoteLabels.push(remotes[i]);
    }
    remoteLabels = remainingRemoteLabels;
  } else {
    remoteLabels = remotes;
  }
  return { heads: headLabels, remotes: remoteLabels };
}

function findCommitElemWithId(elems: HTMLCollectionOf<HTMLElement>, id: number | null) {
  if (id === null) return null;
  let findIdStr = id.toString();
  for (let i = 0; i < elems.length; i++) {
    if (findIdStr === elems[i].dataset.id) return elems[i];
  }
  return null;
}

function generateSignatureHtml(signature: GG.GitSignature) {
  return (
    '<span class="signatureInfo ' +
    signature.status +
    '" title="' +
    GIT_SIGNATURE_STATUS_DESCRIPTIONS[signature.status] +
    ':' +
    ' Signed by ' +
    escapeHtml(signature.signer !== '' ? signature.signer : '<Unknown>') +
    ' (GPG Key Id: ' +
    escapeHtml(signature.key !== '' ? signature.key : '<Unknown>') +
    ')">' +
    (signature.status === GG.GitSignatureStatus.GoodAndValid
      ? SVG_ICONS.passed
      : signature.status === GG.GitSignatureStatus.Bad
        ? SVG_ICONS.failed
        : SVG_ICONS.inconclusive) +
    '</span>'
  );
}

function closeDialogAndContextMenu() {
  if (dialog.isOpen()) dialog.close();
  if (contextMenu.isOpen()) contextMenu.close();
}
