/* Commit Details View - Rendering, Resizing, File Interaction & Code Review */

function closeCdvContextMenuIfOpen(expandedCommit: ExpandedCommit) {
  if (expandedCommit.contextMenuOpen.summary || expandedCommit.contextMenuOpen.fileView > -1) {
    expandedCommit.contextMenuOpen.summary = false;
    expandedCommit.contextMenuOpen.fileView = -1;
    contextMenu.close();
  }
}

function getCommitOrder(view: GitGraphView, hash1: string, hash2: string) {
  const commitLookup = view.getCommitLookup();
  if (commitLookup[hash1] > commitLookup[hash2]) {
    return { from: hash1, to: hash2 };
  } else {
    return { from: hash2, to: hash1 };
  }
}

function getFileViewType(view: GitGraphView) {
  const gitRepos = view.getGitRepos();
  const currentRepo = view.getCurrentRepo();
  const config = view.getConfig();
  return gitRepos[currentRepo].fileViewType === GG.FileViewType.Default
    ? config.commitDetailsView.fileViewType
    : gitRepos[currentRepo].fileViewType;
}

function setFileViewType(view: GitGraphView, type: GG.FileViewType) {
  const gitRepos = view.getGitRepos();
  const currentRepo = view.getCurrentRepo();
  gitRepos[currentRepo].fileViewType = type;
  view.saveRepoState();
}

function setCdvHeight(view: GitGraphView, elem: HTMLElement, isDocked: boolean) {
  const gitRepos = view.getGitRepos();
  const currentRepo = view.getCurrentRepo();
  let height = gitRepos[currentRepo].cdvHeight,
    windowHeight = window.innerHeight;
  if (height > windowHeight - 40) {
    height = Math.max(windowHeight - 40, 100);
    if (height !== gitRepos[currentRepo].cdvHeight) {
      gitRepos[currentRepo].cdvHeight = height;
      view.saveRepoState();
    }
  }

  let heightPx = height + 'px';
  elem.style.height = heightPx;
  if (isDocked) view.getViewElem().style.bottom = heightPx;
}

function setCdvDivider(view: GitGraphView) {
  const gitRepos = view.getGitRepos();
  const currentRepo = view.getCurrentRepo();
  let percent = (gitRepos[currentRepo].cdvDivider * 100).toFixed(2) + '%';
  let summaryElem = document.getElementById('cdvSummary'),
    dividerElem = document.getElementById('cdvDivider'),
    filesElem = document.getElementById('cdvFiles');
  if (summaryElem !== null) summaryElem.style.width = percent;
  if (dividerElem !== null) dividerElem.style.left = percent;
  if (filesElem !== null) filesElem.style.left = percent;
}

function makeCdvResizable(view: GitGraphView) {
  let prevY = -1;

  const processResizingCdvHeight: EventListener = (e) => {
    if (prevY < 0) return;
    let delta = (<MouseEvent>e).pageY - prevY,
      isDocked = view.isCdvDocked(),
      windowHeight = window.innerHeight;
    prevY = (<MouseEvent>e).pageY;
    const gitRepos = view.getGitRepos();
    const currentRepo = view.getCurrentRepo();
    let height = gitRepos[currentRepo].cdvHeight + (isDocked ? -delta : delta);
    if (height < 100) height = 100;
    else if (height > 600) height = 600;
    if (height > windowHeight - 40) height = Math.max(windowHeight - 40, 100);

    if (gitRepos[currentRepo].cdvHeight !== height) {
      gitRepos[currentRepo].cdvHeight = height;
      let elem = document.getElementById('cdv');
      if (elem !== null) setCdvHeight(view, elem, isDocked);
      if (!isDocked) view.renderGraph();
    }
  };
  const stopResizingCdvHeight: EventListener = (e) => {
    if (prevY < 0) return;
    processResizingCdvHeight(e);
    view.saveRepoState();
    prevY = -1;
    eventOverlay.remove();
  };

  addListenerToClass('cdvHeightResize', 'mousedown', (e) => {
    prevY = (<MouseEvent>e).pageY;
    eventOverlay.create('rowResize', processResizingCdvHeight, stopResizingCdvHeight);
  });
}

function makeCdvDividerDraggable(view: GitGraphView) {
  let minX = -1,
    width = -1;

  const processDraggingCdvDivider: EventListener = (e) => {
    if (minX < 0) return;
    let percent = ((<MouseEvent>e).clientX - minX) / width;
    if (percent < 0.2) percent = 0.2;
    else if (percent > 0.8) percent = 0.8;

    const gitRepos = view.getGitRepos();
    const currentRepo = view.getCurrentRepo();
    if (gitRepos[currentRepo].cdvDivider !== percent) {
      gitRepos[currentRepo].cdvDivider = percent;
      setCdvDivider(view);
    }
  };
  const stopDraggingCdvDivider: EventListener = (e) => {
    if (minX < 0) return;
    processDraggingCdvDivider(e);
    view.saveRepoState();
    minX = -1;
    eventOverlay.remove();
  };

  document.getElementById('cdvDivider')!.addEventListener('mousedown', () => {
    const contentElem = document.getElementById('cdvContent');
    if (contentElem === null) return;

    const bounds = contentElem.getBoundingClientRect();
    minX = bounds.left;
    width = bounds.width;
    eventOverlay.create('colResize', processDraggingCdvDivider, stopDraggingCdvDivider);
  });
}

function cdvUpdateFileState(
  view: GitGraphView,
  file: GG.GitFileChange,
  fileElem: HTMLElement,
  isReviewed: boolean | null,
  fileWasViewed: boolean
) {
  const expandedCommit = view.getExpandedCommit(),
    filesElem = document.getElementById('cdvFiles'),
    filePath = file.newFilePath;
  if (expandedCommit === null || expandedCommit.fileTree === null || filesElem === null) return;

  if (fileWasViewed) {
    expandedCommit.lastViewedFile = filePath;
    let lastViewedElem = document.getElementById('cdvLastFileViewed');
    if (lastViewedElem !== null) lastViewedElem.remove();
    lastViewedElem = document.createElement('span');
    lastViewedElem.id = 'cdvLastFileViewed';
    lastViewedElem.title = 'Last File Viewed';
    lastViewedElem.innerHTML = SVG_ICONS.eyeOpen;
    insertBeforeFirstChildWithClass(lastViewedElem, fileElem, 'fileTreeFileAction');
  }

  if (expandedCommit.codeReview !== null) {
    if (isReviewed !== null) {
      if (isReviewed) {
        expandedCommit.codeReview.remainingFiles = expandedCommit.codeReview.remainingFiles.filter(
          (path: string) => path !== filePath
        );
      } else {
        expandedCommit.codeReview.remainingFiles.push(filePath);
      }

      alterFileTreeFileReviewed(expandedCommit.fileTree, filePath, isReviewed);
      updateFileTreeHtmlFileReviewed(filesElem, expandedCommit.fileTree, filePath);
    }

    sendMessage({
      command: 'updateCodeReview',
      repo: view.getCurrentRepo(),
      id: expandedCommit.codeReview.id,
      remainingFiles: expandedCommit.codeReview.remainingFiles,
      lastViewedFile: expandedCommit.lastViewedFile
    });

    if (expandedCommit.codeReview.remainingFiles.length === 0) {
      expandedCommit.codeReview = null;
      renderCodeReviewBtn(view);
    }
  }

  view.saveState();
}

function changeFileViewType(view: GitGraphView, type: GG.FileViewType) {
  const expandedCommit = view.getExpandedCommit(),
    filesElem = document.getElementById('cdvFiles');
  if (
    expandedCommit === null ||
    expandedCommit.fileTree === null ||
    expandedCommit.fileChanges === null ||
    filesElem === null
  )
    return;
  closeCdvContextMenuIfOpen(expandedCommit);
  setFileViewType(view, type);
  const commitOrder = getCommitOrder(
    view,
    expandedCommit.commitHash,
    expandedCommit.compareWithHash === null
      ? expandedCommit.commitHash
      : expandedCommit.compareWithHash
  );
  filesElem.innerHTML = generateFileViewHtml(
    expandedCommit.fileTree,
    expandedCommit.fileChanges,
    expandedCommit.lastViewedFile,
    expandedCommit.contextMenuOpen.fileView,
    type,
    commitOrder.to === UNCOMMITTED
  );
  makeCdvFileViewInteractive(view);
  renderCdvFileViewTypeBtns(view);
}

function makeCdvFileViewInteractive(view: GitGraphView) {
  const getFileElemOfEventTarget = (target: EventTarget) =>
    <HTMLElement>(<Element>target).closest('.fileTreeFileRecord');
  const getFileOfFileElem = (fileChanges: ReadonlyArray<GG.GitFileChange>, fileElem: HTMLElement) =>
    fileChanges[parseInt(fileElem.dataset.index!)];

  const getCommitHashForFile = (file: GG.GitFileChange, expandedCommit: ExpandedCommit) => {
    const commits = view.getCommits();
    const commitLookup = view.getCommitLookup();
    const commit = commits[commitLookup[expandedCommit.commitHash]];
    if (expandedCommit.compareWithHash !== null) {
      return getCommitOrder(view, expandedCommit.commitHash, expandedCommit.compareWithHash).to;
    } else if (commit.stash !== null && file.type === GG.GitFileStatus.Untracked) {
      return commit.stash.untrackedFilesHash!;
    } else {
      return expandedCommit.commitHash;
    }
  };

  const triggerViewFileDiff = (file: GG.GitFileChange, fileElem: HTMLElement) => {
    const expandedCommit = view.getExpandedCommit();
    if (expandedCommit === null) return;

    const commits = view.getCommits();
    const commitLookup = view.getCommitLookup();
    const currentRepo = view.getCurrentRepo();
    let commit = commits[commitLookup[expandedCommit.commitHash]],
      fromHash: string,
      toHash: string,
      fileStatus = file.type;
    if (expandedCommit.compareWithHash !== null) {
      const commitOrder = getCommitOrder(
        view,
        expandedCommit.commitHash,
        expandedCommit.compareWithHash
      );
      fromHash = commitOrder.from;
      toHash = commitOrder.to;
    } else if (commit.stash !== null) {
      if (fileStatus === GG.GitFileStatus.Untracked) {
        fromHash = commit.stash.untrackedFilesHash!;
        toHash = commit.stash.untrackedFilesHash!;
        fileStatus = GG.GitFileStatus.Added;
      } else {
        fromHash = commit.stash.baseHash;
        toHash = expandedCommit.commitHash;
      }
    } else {
      fromHash = expandedCommit.commitHash;
      toHash = expandedCommit.commitHash;
    }

    cdvUpdateFileState(view, file, fileElem, true, true);
    sendMessage({
      command: 'viewDiff',
      repo: currentRepo,
      fromHash: fromHash,
      toHash: toHash,
      oldFilePath: file.oldFilePath,
      newFilePath: file.newFilePath,
      type: fileStatus
    });
  };

  const triggerCopyFilePath = (file: GG.GitFileChange, absolute: boolean) => {
    sendMessage({
      command: 'copyFilePath',
      repo: view.getCurrentRepo(),
      filePath: file.newFilePath,
      absolute: absolute
    });
  };

  const triggerResetFileToRevision = (file: GG.GitFileChange, fileElem: HTMLElement) => {
    const expandedCommit = view.getExpandedCommit();
    if (expandedCommit === null) return;

    const commitHash = getCommitHashForFile(file, expandedCommit);
    dialog.showConfirmation(
      'Are you sure you want to reset <b><i>' +
        escapeHtml(file.newFilePath) +
        "</i></b> to it's state at commit <b><i>" +
        abbrevCommit(commitHash) +
        '</i></b>? Any uncommitted changes made to this file will be overwritten.',
      'Yes, reset file',
      () => {
        runAction(
          {
            command: 'resetFileToRevision',
            repo: view.getCurrentRepo(),
            commitHash: commitHash,
            filePath: file.newFilePath
          },
          'Resetting file'
        );
      },
      {
        type: TargetType.CommitDetailsView,
        hash: commitHash,
        elem: fileElem
      }
    );
  };

  const triggerViewFileAtRevision = (file: GG.GitFileChange, fileElem: HTMLElement) => {
    const expandedCommit = view.getExpandedCommit();
    if (expandedCommit === null) return;

    cdvUpdateFileState(view, file, fileElem, true, true);
    sendMessage({
      command: 'viewFileAtRevision',
      repo: view.getCurrentRepo(),
      hash: getCommitHashForFile(file, expandedCommit),
      filePath: file.newFilePath
    });
  };

  const triggerViewFileDiffWithWorkingFile = (file: GG.GitFileChange, fileElem: HTMLElement) => {
    const expandedCommit = view.getExpandedCommit();
    if (expandedCommit === null) return;

    cdvUpdateFileState(view, file, fileElem, null, true);
    sendMessage({
      command: 'viewDiffWithWorkingFile',
      repo: view.getCurrentRepo(),
      hash: getCommitHashForFile(file, expandedCommit),
      filePath: file.newFilePath
    });
  };

  const triggerOpenFile = (file: GG.GitFileChange, fileElem: HTMLElement) => {
    const expandedCommit = view.getExpandedCommit();
    if (expandedCommit === null) return;

    cdvUpdateFileState(view, file, fileElem, true, true);
    sendMessage({
      command: 'openFile',
      repo: view.getCurrentRepo(),
      hash: getCommitHashForFile(file, expandedCommit),
      filePath: file.newFilePath
    });
  };

  addListenerToClass('fileTreeFolder', 'click', (e) => {
    let expandedCommit = view.getExpandedCommit();
    if (expandedCommit === null || expandedCommit.fileTree === null || e.target === null) return;

    let sourceElem = <HTMLElement>(<Element>e.target).closest('.fileTreeFolder');
    let parent = sourceElem.parentElement!;
    parent.classList.toggle('closed');
    let isOpen = !parent.classList.contains('closed');
    parent.children[0].children[0].innerHTML = isOpen
      ? SVG_ICONS.openFolder
      : SVG_ICONS.closedFolder;
    parent.children[1].classList.toggle('hidden');
    alterFileTreeFolderOpen(
      expandedCommit.fileTree,
      decodeURIComponent(sourceElem.dataset.folderpath!),
      isOpen
    );
    view.saveState();
  });

  addListenerToClass('fileTreeRepo', 'click', (e) => {
    if (e.target === null) return;
    view.loadRepos(view.getGitRepos(), null, {
      repo: decodeURIComponent(
        (<HTMLElement>(<Element>e.target).closest('.fileTreeRepo')).dataset.path!
      )
    });
  });

  addListenerToClass('fileTreeFile', 'click', (e) => {
    const expandedCommit = view.getExpandedCommit();
    if (expandedCommit === null || expandedCommit.fileChanges === null || e.target === null) return;

    const sourceElem = <HTMLElement>(<Element>e.target).closest('.fileTreeFile'),
      fileElem = getFileElemOfEventTarget(e.target);
    if (!sourceElem.classList.contains('gitDiffPossible')) return;
    triggerViewFileDiff(getFileOfFileElem(expandedCommit.fileChanges, fileElem), fileElem);
  });

  addListenerToClass('copyGitFile', 'click', (e) => {
    const expandedCommit = view.getExpandedCommit();
    if (expandedCommit === null || expandedCommit.fileChanges === null || e.target === null) return;

    const fileElem = getFileElemOfEventTarget(e.target);
    triggerCopyFilePath(getFileOfFileElem(expandedCommit.fileChanges, fileElem), true);
  });

  addListenerToClass('viewGitFileAtRevision', 'click', (e) => {
    const expandedCommit = view.getExpandedCommit();
    if (expandedCommit === null || expandedCommit.fileChanges === null || e.target === null) return;

    const fileElem = getFileElemOfEventTarget(e.target);
    triggerViewFileAtRevision(getFileOfFileElem(expandedCommit.fileChanges, fileElem), fileElem);
  });

  addListenerToClass('openGitFile', 'click', (e) => {
    const expandedCommit = view.getExpandedCommit();
    if (expandedCommit === null || expandedCommit.fileChanges === null || e.target === null) return;

    const fileElem = getFileElemOfEventTarget(e.target);
    triggerOpenFile(getFileOfFileElem(expandedCommit.fileChanges, fileElem), fileElem);
  });

  addListenerToClass('fileTreeFileRecord', 'contextmenu', (e: Event) => {
    handledEvent(e);
    const expandedCommit = view.getExpandedCommit();
    if (expandedCommit === null || expandedCommit.fileChanges === null || e.target === null) return;
    const fileElem = getFileElemOfEventTarget(e.target);
    const file = getFileOfFileElem(expandedCommit.fileChanges, fileElem);
    const commitOrder = getCommitOrder(
      view,
      expandedCommit.commitHash,
      expandedCommit.compareWithHash === null
        ? expandedCommit.commitHash
        : expandedCommit.compareWithHash
    );
    const isUncommitted = commitOrder.to === UNCOMMITTED;

    closeCdvContextMenuIfOpen(expandedCommit);
    expandedCommit.contextMenuOpen.fileView = parseInt(fileElem.dataset.index!);

    const commitLookup = view.getCommitLookup();
    const target: ContextMenuTarget & CommitTarget = {
      type: TargetType.CommitDetailsView,
      hash: expandedCommit.commitHash,
      index: commitLookup[expandedCommit.commitHash],
      elem: fileElem
    };
    const diffPossible =
      file.type === GG.GitFileStatus.Untracked ||
      (file.additions !== null && file.deletions !== null);
    const fileExistsAtThisRevision = file.type !== GG.GitFileStatus.Deleted && !isUncommitted;
    const fileExistsAtThisRevisionAndDiffPossible = fileExistsAtThisRevision && diffPossible;
    const codeReviewInProgressAndNotReviewed =
      expandedCommit.codeReview !== null &&
      expandedCommit.codeReview.remainingFiles.includes(file.newFilePath);
    const visibility = view.getConfig().contextMenuActionsVisibility.commitDetailsViewFile;

    contextMenu.show(
      [
        [
          {
            title: 'View Diff',
            visible: visibility.viewDiff && diffPossible,
            onClick: () => triggerViewFileDiff(file, fileElem)
          },
          {
            title: 'View File at this Revision',
            visible: visibility.viewFileAtThisRevision && fileExistsAtThisRevisionAndDiffPossible,
            onClick: () => triggerViewFileAtRevision(file, fileElem)
          },
          {
            title: 'View Diff with Working File',
            visible: visibility.viewDiffWithWorkingFile && fileExistsAtThisRevisionAndDiffPossible,
            onClick: () => triggerViewFileDiffWithWorkingFile(file, fileElem)
          },
          {
            title: 'Open File',
            visible: visibility.openFile && file.type !== GG.GitFileStatus.Deleted,
            onClick: () => triggerOpenFile(file, fileElem)
          }
        ],
        [
          {
            title: 'Mark as Reviewed',
            visible: visibility.markAsReviewed && codeReviewInProgressAndNotReviewed,
            onClick: () => cdvUpdateFileState(view, file, fileElem, true, false)
          },
          {
            title: 'Mark as Not Reviewed',
            visible:
              visibility.markAsNotReviewed &&
              expandedCommit.codeReview !== null &&
              !codeReviewInProgressAndNotReviewed,
            onClick: () => cdvUpdateFileState(view, file, fileElem, false, false)
          }
        ],
        [
          {
            title: 'Reset File to this Revision' + ELLIPSIS,
            visible:
              visibility.resetFileToThisRevision &&
              fileExistsAtThisRevision &&
              expandedCommit.compareWithHash === null,
            onClick: () => triggerResetFileToRevision(file, fileElem)
          }
        ],
        [
          {
            title: 'Copy Absolute File Path to Clipboard',
            visible: visibility.copyAbsoluteFilePath,
            onClick: () => triggerCopyFilePath(file, true)
          },
          {
            title: 'Copy Relative File Path to Clipboard',
            visible: visibility.copyRelativeFilePath,
            onClick: () => triggerCopyFilePath(file, false)
          }
        ]
      ],
      false,
      target,
      <MouseEvent>e,
      view.isCdvDocked() ? document.body : view.getViewElem(),
      () => {
        expandedCommit.contextMenuOpen.fileView = -1;
      }
    );
  });
}

function renderCdvFileViewTypeBtns(view: GitGraphView) {
  if (view.getExpandedCommit() === null) return;
  let treeBtnElem = document.getElementById('cdvFileViewTypeTree'),
    listBtnElem = document.getElementById('cdvFileViewTypeList');
  if (treeBtnElem === null || listBtnElem === null) return;

  let listView = getFileViewType(view) === GG.FileViewType.List;
  alterClass(treeBtnElem, CLASS_ACTIVE, !listView);
  alterClass(listBtnElem, CLASS_ACTIVE, listView);
}

function renderCdvExternalDiffBtn(view: GitGraphView) {
  if (view.getExpandedCommit() === null) return;
  const externalDiffBtnElem = document.getElementById('cdvExternalDiff');
  if (externalDiffBtnElem === null) return;

  const gitConfig = view.getGitConfig();
  alterClass(
    externalDiffBtnElem,
    CLASS_ENABLED,
    gitConfig !== null && (gitConfig.diffTool !== null || gitConfig.guiDiffTool !== null)
  );
  const toolName =
    gitConfig !== null
      ? gitConfig.guiDiffTool !== null
        ? gitConfig.guiDiffTool
        : gitConfig.diffTool
      : null;
  externalDiffBtnElem.title =
    'Open External Directory Diff' + (toolName !== null ? ' with "' + toolName + '"' : '');
}

function saveAndRenderCodeReview(view: GitGraphView, codeReview: GG.CodeReview | null) {
  let filesElem = document.getElementById('cdvFiles');
  const expandedCommit = view.getExpandedCommit();
  if (expandedCommit === null || expandedCommit.fileTree === null || filesElem === null) return;

  expandedCommit.codeReview = codeReview;
  setFileTreeReviewed(expandedCommit.fileTree, codeReview === null);
  view.saveState();
  renderCodeReviewBtn(view);
  updateFileTreeHtml(filesElem, expandedCommit.fileTree);
}

function renderCodeReviewBtn(view: GitGraphView) {
  const expandedCommit = view.getExpandedCommit();
  if (expandedCommit === null) return;
  let btnElem = document.getElementById('cdvCodeReview');
  if (btnElem === null) return;

  let active = expandedCommit.codeReview !== null;
  alterClass(btnElem, CLASS_ACTIVE, active);
  btnElem.title = (active ? 'End' : 'Start') + ' Code Review';
}

function renderCommitDetailsView(view: GitGraphView, refresh: boolean) {
  const expandedCommit = view.getExpandedCommit();
  if (expandedCommit === null || expandedCommit.commitElem === null) return;

  const commits = view.getCommits();
  const commitLookup = view.getCommitLookup();
  const gitRepos = view.getGitRepos();
  const currentRepo = view.getCurrentRepo();
  const config = view.getConfig();
  const isDocked = view.isCdvDocked();

  let elem = document.getElementById('cdv'),
    html = '<div id="cdvContent">';
  const commitOrder = getCommitOrder(
    view,
    expandedCommit.commitHash,
    expandedCommit.compareWithHash === null
      ? expandedCommit.commitHash
      : expandedCommit.compareWithHash
  );
  const codeReviewPossible = !expandedCommit.loading && commitOrder.to !== UNCOMMITTED;
  const externalDiffPossible =
    !expandedCommit.loading &&
    (expandedCommit.compareWithHash !== null ||
      commits[commitLookup[expandedCommit.commitHash]].parents.length > 0);

  if (elem === null) {
    elem = document.createElement(isDocked ? 'div' : 'tr');
    elem.id = 'cdv';
    elem.className = isDocked ? 'docked' : 'inline';
    setCdvHeight(view, elem, isDocked);
    if (isDocked) {
      document.body.appendChild(elem);
    } else {
      insertAfter(elem, expandedCommit.commitElem);
    }
  }

  if (expandedCommit.loading) {
    html +=
      '<div id="cdvLoading">' +
      SVG_ICONS.loading +
      ' Loading ' +
      (expandedCommit.compareWithHash === null
        ? expandedCommit.commitHash !== UNCOMMITTED
          ? 'Commit Details'
          : 'Uncommitted Changes'
        : 'Commit Comparison') +
      ' ...</div>';
  } else {
    html += '<div id="cdvSummary">';
    if (expandedCommit.compareWithHash === null) {
      if (expandedCommit.commitHash !== UNCOMMITTED) {
        const textFormatter = new TextFormatter(commits, gitRepos[currentRepo].issueLinkingConfig, {
          commits: true,
          emoji: true,
          issueLinking: true,
          markdown: config.markdown,
          multiline: true,
          urls: true
        });
        const commitDetails = expandedCommit.commitDetails!;
        const parents =
          commitDetails.parents.length > 0
            ? commitDetails.parents
                .map((parent) => {
                  const escapedParent = escapeHtml(parent);
                  return typeof commitLookup[parent] === 'number'
                    ? '<span class="' +
                        CLASS_INTERNAL_URL +
                        '" data-type="commit" data-value="' +
                        escapedParent +
                        '" tabindex="-1">' +
                        escapedParent +
                        '</span>'
                    : escapedParent;
                })
                .join(', ')
            : 'None';
        html +=
          '<span class="cdvSummaryTop' +
          (expandedCommit.avatar !== null ? ' withAvatar' : '') +
          '"><span class="cdvSummaryTopRow"><span class="cdvSummaryKeyValues">' +
          '<b>Commit: </b>' +
          escapeHtml(commitDetails.hash) +
          '<br>' +
          '<b>Parents: </b>' +
          parents +
          '<br>' +
          '<b>Author: </b>' +
          escapeHtml(commitDetails.author) +
          (commitDetails.authorEmail !== ''
            ? ' &lt;<a class="' +
              CLASS_EXTERNAL_URL +
              '" href="mailto:' +
              escapeHtml(commitDetails.authorEmail) +
              '" tabindex="-1">' +
              escapeHtml(commitDetails.authorEmail) +
              '</a>&gt;'
            : '') +
          '<br>' +
          (commitDetails.authorDate !== commitDetails.committerDate
            ? '<b>Author Date: </b>' + formatLongDate(commitDetails.authorDate) + '<br>'
            : '') +
          '<b>Committer: </b>' +
          escapeHtml(commitDetails.committer) +
          (commitDetails.committerEmail !== ''
            ? ' &lt;<a class="' +
              CLASS_EXTERNAL_URL +
              '" href="mailto:' +
              escapeHtml(commitDetails.committerEmail) +
              '" tabindex="-1">' +
              escapeHtml(commitDetails.committerEmail) +
              '</a>&gt;'
            : '') +
          (commitDetails.signature !== null ? generateSignatureHtml(commitDetails.signature) : '') +
          '<br>' +
          '<b>' +
          (commitDetails.authorDate !== commitDetails.committerDate ? 'Committer ' : '') +
          'Date: </b>' +
          formatLongDate(commitDetails.committerDate) +
          '</span>' +
          (expandedCommit.avatar !== null
            ? '<span class="cdvSummaryAvatar"><img src="' + expandedCommit.avatar + '"></span>'
            : '') +
          '</span></span><br><br>' +
          textFormatter.format(commitDetails.body);
      } else {
        html += 'Displaying all uncommitted changes.';
      }
    } else {
      html +=
        'Displaying all changes from <b>' +
        commitOrder.from +
        '</b> to <b>' +
        (commitOrder.to !== UNCOMMITTED ? commitOrder.to : 'Uncommitted Changes') +
        '</b>.';
    }
    html +=
      '</div><div id="cdvFiles">' +
      generateFileViewHtml(
        expandedCommit.fileTree!,
        expandedCommit.fileChanges!,
        expandedCommit.lastViewedFile,
        expandedCommit.contextMenuOpen.fileView,
        getFileViewType(view),
        commitOrder.to === UNCOMMITTED
      ) +
      '</div><div id="cdvDivider"></div>';
  }
  html +=
    '</div><div id="cdvControls"><div id="cdvClose" class="cdvControlBtn" title="Close">' +
    SVG_ICONS.close +
    '</div>' +
    (codeReviewPossible
      ? '<div id="cdvCodeReview" class="cdvControlBtn">' + SVG_ICONS.review + '</div>'
      : '') +
    (!expandedCommit.loading
      ? '<div id="cdvFileViewTypeTree" class="cdvControlBtn cdvFileViewTypeBtn" title="File Tree View">' +
        SVG_ICONS.fileTree +
        '</div><div id="cdvFileViewTypeList" class="cdvControlBtn cdvFileViewTypeBtn" title="File List View">' +
        SVG_ICONS.fileList +
        '</div>'
      : '') +
    (externalDiffPossible
      ? '<div id="cdvExternalDiff" class="cdvControlBtn">' + SVG_ICONS.linkExternal + '</div>'
      : '') +
    '</div><div class="cdvHeightResize"></div>';

  elem.innerHTML = isDocked
    ? html
    : '<td><div class="cdvHeightResize"></div></td><td colspan="' +
      (view.getNumColumns() - 1) +
      '">' +
      html +
      '</td>';
  if (!expandedCommit.loading) setCdvDivider(view);
  if (!isDocked) view.renderGraph();

  const controlsElem = view.getControlsElem();
  const viewElem = view.getViewElem();

  if (!refresh) {
    if (isDocked) {
      let elemTop = controlsElem.clientHeight + expandedCommit.commitElem.offsetTop;
      if (elemTop - 8 < viewElem.scrollTop) {
        viewElem.scroll(0, elemTop - 8);
      } else if (elemTop - viewElem.clientHeight + 32 > viewElem.scrollTop) {
        viewElem.scroll(0, elemTop - viewElem.clientHeight + 32);
      }
    } else {
      let elemTop = controlsElem.clientHeight + elem.offsetTop,
        cdvHeight = gitRepos[currentRepo].cdvHeight;
      if (config.commitDetailsView.autoCenter) {
        viewElem.scroll(0, elemTop - 12 + (cdvHeight - viewElem.clientHeight) / 2);
      } else if (elemTop - 32 < viewElem.scrollTop) {
        viewElem.scroll(0, elemTop - 32);
      } else if (elemTop + cdvHeight - viewElem.clientHeight + 8 > viewElem.scrollTop) {
        viewElem.scroll(0, elemTop + cdvHeight - viewElem.clientHeight + 8);
      }
    }
  }

  makeCdvResizable(view);
  document.getElementById('cdvClose')!.addEventListener('click', () => {
    view.closeCommitDetails(true);
  });

  if (!expandedCommit.loading) {
    makeCdvFileViewInteractive(view);
    renderCdvFileViewTypeBtns(view);
    renderCdvExternalDiffBtn(view);
    makeCdvDividerDraggable(view);

    observeElemScroll(
      'cdvSummary',
      expandedCommit.scrollTop.summary,
      (scrollTop) => {
        const ec = view.getExpandedCommit();
        if (ec === null) return;
        ec.scrollTop.summary = scrollTop;
        if (ec.contextMenuOpen.summary) {
          ec.contextMenuOpen.summary = false;
          contextMenu.close();
        }
      },
      () => view.saveState()
    );

    observeElemScroll(
      'cdvFiles',
      expandedCommit.scrollTop.fileView,
      (scrollTop) => {
        const ec = view.getExpandedCommit();
        if (ec === null) return;
        ec.scrollTop.fileView = scrollTop;
        if (ec.contextMenuOpen.fileView > -1) {
          ec.contextMenuOpen.fileView = -1;
          contextMenu.close();
        }
      },
      () => view.saveState()
    );

    document.getElementById('cdvFileViewTypeTree')!.addEventListener('click', () => {
      changeFileViewType(view, GG.FileViewType.Tree);
    });

    document.getElementById('cdvFileViewTypeList')!.addEventListener('click', () => {
      changeFileViewType(view, GG.FileViewType.List);
    });

    if (codeReviewPossible) {
      renderCodeReviewBtn(view);
      document.getElementById('cdvCodeReview')!.addEventListener('click', (e) => {
        const expandedCommit = view.getExpandedCommit();
        if (expandedCommit === null || e.target === null) return;
        let sourceElem = <HTMLElement>(<Element>e.target).closest('#cdvCodeReview')!;
        if (sourceElem.classList.contains(CLASS_ACTIVE)) {
          sendMessage({
            command: 'endCodeReview',
            repo: view.getCurrentRepo(),
            id: expandedCommit.codeReview!.id
          });
          view.endCodeReview();
        } else {
          const commitOrder = getCommitOrder(
            view,
            expandedCommit.commitHash,
            expandedCommit.compareWithHash === null
              ? expandedCommit.commitHash
              : expandedCommit.compareWithHash
          );
          const id =
            expandedCommit.compareWithHash !== null
              ? commitOrder.from + '-' + commitOrder.to
              : expandedCommit.commitHash;
          sendMessage({
            command: 'startCodeReview',
            repo: view.getCurrentRepo(),
            id: id,
            commitHash: expandedCommit.commitHash,
            compareWithHash: expandedCommit.compareWithHash,
            files: getFilesInTree(expandedCommit.fileTree!, expandedCommit.fileChanges!),
            lastViewedFile: expandedCommit.lastViewedFile
          });
        }
      });
    }

    if (externalDiffPossible) {
      document.getElementById('cdvExternalDiff')!.addEventListener('click', () => {
        const expandedCommit = view.getExpandedCommit();
        const gitConfig = view.getGitConfig();
        if (
          expandedCommit === null ||
          gitConfig === null ||
          (gitConfig.diffTool === null && gitConfig.guiDiffTool === null)
        )
          return;
        const commitOrder = getCommitOrder(
          view,
          expandedCommit.commitHash,
          expandedCommit.compareWithHash === null
            ? expandedCommit.commitHash
            : expandedCommit.compareWithHash
        );
        runAction(
          {
            command: 'openExternalDirDiff',
            repo: view.getCurrentRepo(),
            fromHash: commitOrder.from,
            toHash: commitOrder.to,
            isGui: gitConfig.guiDiffTool !== null
          },
          'Opening External Directory Diff'
        );
      });
    }
  }
}
