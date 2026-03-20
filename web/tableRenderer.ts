/* Table & Graph Rendering */

function getColumnVisibility(view: GitGraphView) {
  const gitRepos = view.getGitRepos();
  const currentRepo = view.getCurrentRepo();
  const config = view.getConfig();
  let colWidths = gitRepos[currentRepo].columnWidths;
  if (colWidths !== null) {
    return {
      date: colWidths[1] !== COLUMN_HIDDEN,
      author: colWidths[2] !== COLUMN_HIDDEN,
      commit: colWidths[3] !== COLUMN_HIDDEN
    };
  } else {
    let defaults = config.defaultColumnVisibility;
    return { date: defaults.date, author: defaults.author, commit: defaults.commit };
  }
}

function getNumColumns(view: GitGraphView) {
  let colVisibility = getColumnVisibility(view);
  return (
    2 +
    (colVisibility.date ? 1 : 0) +
    (colVisibility.author ? 1 : 0) +
    (colVisibility.commit ? 1 : 0)
  );
}

function renderView(view: GitGraphView) {
  renderTableView(view);
  renderGraphView(view);
}

function renderGraphView(view: GitGraphView) {
  if (typeof view.getCurrentRepo() === 'undefined') {
    return;
  }

  const config = view.getConfig();
  const gitRepos = view.getGitRepos();
  const currentRepo = view.getCurrentRepo();
  const commits = view.getCommits();
  const tableElem = view.getTableElem();
  const graph = view.getGraph();

  const colHeadersElem = document.getElementById('tableColHeaders');
  const cdvHeight = gitRepos[currentRepo].cdvHeight;
  const headerHeight = colHeadersElem !== null ? colHeadersElem.clientHeight + 1 : 0;
  const expandedCommit = view.isCdvDocked() ? null : view.getExpandedCommit();
  const expandedCommitElem = expandedCommit !== null ? document.getElementById('cdv') : null;

  config.graph.grid.expandY =
    expandedCommitElem !== null ? expandedCommitElem.getBoundingClientRect().height : cdvHeight;
  config.graph.grid.y =
    commits.length > 0 && tableElem.children.length > 0
      ? (tableElem.children[0].clientHeight -
          headerHeight -
          (expandedCommit !== null ? cdvHeight : 0)) /
        commits.length
      : config.graph.grid.y;
  config.graph.grid.offsetY = headerHeight + config.graph.grid.y / 2;

  graph.render(expandedCommit);
}

function renderTableView(view: GitGraphView) {
  const config = view.getConfig();
  const gitRepos = view.getGitRepos();
  const currentRepo = view.getCurrentRepo();
  const commits = view.getCommits();
  const commitHead = view.getCommitHead();
  const gitBranchHead = view.getGitBranchHead();
  const avatars = view.getAvatars();
  const expandedCommit = view.getExpandedCommit();
  const tableElem = view.getTableElem();
  const footerElem = view.getFooterElem();
  const moreCommitsAvailable = view.getMoreCommitsAvailable();
  const graph = view.getGraph();
  const findWidget = view.getFindWidget();

  const colVisibility = getColumnVisibility(view);
  const currentHash =
    commits.length > 0 && commits[0].hash === UNCOMMITTED ? UNCOMMITTED : commitHead;
  const vertexColours = graph.getVertexColours();
  const widthsAtVertices = config.referenceLabels.branchLabelsAlignedToGraph
    ? graph.getWidthsAtVertices()
    : [];
  const mutedCommits = graph.getMutedCommits(currentHash);
  const textFormatter = new TextFormatter(commits, gitRepos[currentRepo].issueLinkingConfig, {
    emoji: true,
    issueLinking: true,
    markdown: config.markdown
  });

  let html =
    '<tr id="tableColHeaders"><th id="tableHeaderGraphCol" class="tableColHeader" data-col="0">Graph</th><th class="tableColHeader" data-col="1">Description</th>' +
    (colVisibility.date ? '<th class="tableColHeader dateCol" data-col="2">Date</th>' : '') +
    (colVisibility.author ? '<th class="tableColHeader authorCol" data-col="3">Author</th>' : '') +
    (colVisibility.commit ? '<th class="tableColHeader" data-col="4">Commit</th>' : '') +
    '</tr>';

  for (let i = 0; i < commits.length; i++) {
    let commit = commits[i];
    let message = '<span class="text">' + textFormatter.format(commit.message) + '</span>';
    let date = formatShortDate(commit.date);
    let branchLabels = getBranchLabels(commit.heads, commit.remotes);
    let refBranches = '',
      refTags = '',
      j,
      k,
      refName,
      remoteName,
      refActive,
      refHtml,
      branchCheckedOutAtCommit: string | null = null;

    for (j = 0; j < branchLabels.heads.length; j++) {
      refName = escapeHtml(branchLabels.heads[j].name);
      refActive = branchLabels.heads[j].name === gitBranchHead;
      refHtml =
        '<span class="gitRef head' +
        (refActive ? ' active' : '') +
        '" data-name="' +
        refName +
        '">' +
        SVG_ICONS.branch +
        '<span class="gitRefName" data-fullref="' +
        refName +
        '">' +
        refName +
        '</span>';
      for (k = 0; k < branchLabels.heads[j].remotes.length; k++) {
        remoteName = escapeHtml(branchLabels.heads[j].remotes[k]);
        refHtml +=
          '<span class="gitRefHeadRemote" data-remote="' +
          remoteName +
          '" data-fullref="' +
          escapeHtml(branchLabels.heads[j].remotes[k] + '/' + branchLabels.heads[j].name) +
          '">' +
          remoteName +
          '</span>';
      }
      refHtml += '</span>';
      refBranches = refActive ? refHtml + refBranches : refBranches + refHtml;
      if (refActive) branchCheckedOutAtCommit = gitBranchHead;
    }
    for (j = 0; j < branchLabels.remotes.length; j++) {
      refName = escapeHtml(branchLabels.remotes[j].name);
      refBranches +=
        '<span class="gitRef remote" data-name="' +
        refName +
        '" data-remote="' +
        (branchLabels.remotes[j].remote !== null
          ? escapeHtml(branchLabels.remotes[j].remote!)
          : '') +
        '">' +
        SVG_ICONS.branch +
        '<span class="gitRefName" data-fullref="' +
        refName +
        '">' +
        refName +
        '</span></span>';
    }

    for (j = 0; j < commit.tags.length; j++) {
      refName = escapeHtml(commit.tags[j].name);
      refTags +=
        '<span class="gitRef tag" data-name="' +
        refName +
        '" data-tagtype="' +
        (commit.tags[j].annotated ? 'annotated' : 'lightweight') +
        '">' +
        SVG_ICONS.tag +
        '<span class="gitRefName" data-fullref="' +
        refName +
        '">' +
        refName +
        '</span></span>';
    }

    if (commit.stash !== null) {
      refName = escapeHtml(commit.stash.selector);
      refBranches =
        '<span class="gitRef stash" data-name="' +
        refName +
        '">' +
        SVG_ICONS.stash +
        '<span class="gitRefName" data-fullref="' +
        refName +
        '">' +
        escapeHtml(commit.stash.selector.substring(5)) +
        '</span></span>' +
        refBranches;
    }

    const commitDot =
      commit.hash === commitHead
        ? '<span class="commitHeadDot" title="' +
          (branchCheckedOutAtCommit !== null
            ? 'The branch ' +
              escapeHtml('"' + branchCheckedOutAtCommit + '"') +
              ' is currently checked out at this commit'
            : 'This commit is currently checked out') +
          '."></span>'
        : '';

    html +=
      '<tr class="commit' +
      (commit.hash === currentHash ? ' current' : '') +
      (mutedCommits[i] ? ' mute' : '') +
      '"' +
      (commit.hash !== UNCOMMITTED ? '' : ' id="uncommittedChanges"') +
      ' data-id="' +
      i +
      '" data-color="' +
      vertexColours[i] +
      '">' +
      (config.referenceLabels.branchLabelsAlignedToGraph
        ? '<td>' +
          (refBranches !== ''
            ? '<span style="margin-left:' +
              (widthsAtVertices[i] - 4) +
              'px"' +
              refBranches.substring(5)
            : '') +
          '</td><td><span class="description">' +
          commitDot
        : '<td></td><td><span class="description">' + commitDot + refBranches) +
      (config.referenceLabels.tagLabelsOnRight ? message + refTags : refTags + message) +
      '</span></td>' +
      (colVisibility.date
        ? '<td class="dateCol text" title="' + date.title + '">' + date.formatted + '</td>'
        : '') +
      (colVisibility.author
        ? '<td class="authorCol text" title="' +
          escapeHtml(commit.author + ' <' + commit.email + '>') +
          '">' +
          (config.fetchAvatars
            ? '<span class="avatar" data-email="' +
              escapeHtml(commit.email) +
              '">' +
              (typeof avatars[commit.email] === 'string'
                ? '<img class="avatarImg" src="' + avatars[commit.email] + '">'
                : '') +
              '</span>'
            : '') +
          escapeHtml(commit.author) +
          '</td>'
        : '') +
      (colVisibility.commit
        ? '<td class="text" title="' +
          escapeHtml(commit.hash) +
          '">' +
          abbrevCommit(commit.hash) +
          '</td>'
        : '') +
      '</tr>';
  }
  tableElem.innerHTML = '<table>' + html + '</table>';
  footerElem.innerHTML = moreCommitsAvailable
    ? '<div id="loadMoreCommitsBtn" class="roundedBtn">Load More Commits</div>'
    : '';
  makeTableResizable(view);
  findWidget.refresh();
  view.setRenderedGitBranchHead(gitBranchHead);

  if (moreCommitsAvailable) {
    document.getElementById('loadMoreCommitsBtn')!.addEventListener('click', () => {
      view.loadMoreCommits();
    });
  }

  if (expandedCommit !== null) {
    const elems = getCommitElems();
    const commitElem = findCommitElemWithId(elems, view.getCommitId(expandedCommit.commitHash));
    const compareWithElem =
      expandedCommit.compareWithHash !== null
        ? findCommitElemWithId(elems, view.getCommitId(expandedCommit.compareWithHash))
        : null;

    if (
      commitElem === null ||
      (expandedCommit.compareWithHash !== null && compareWithElem === null)
    ) {
      view.closeCommitDetails(false);
      view.saveState();
    } else {
      expandedCommit.index = parseInt(commitElem.dataset.id!);
      expandedCommit.commitElem = commitElem;
      expandedCommit.compareWithElem = compareWithElem;
      view.saveState();
      if (expandedCommit.compareWithHash === null) {
        if (
          !expandedCommit.loading &&
          expandedCommit.commitDetails !== null &&
          expandedCommit.fileTree !== null
        ) {
          view.showCommitDetails(
            expandedCommit.commitDetails,
            expandedCommit.fileTree,
            expandedCommit.avatar,
            expandedCommit.codeReview,
            expandedCommit.lastViewedFile,
            true
          );
          if (expandedCommit.commitHash === UNCOMMITTED) {
            view.requestCommitDetails(expandedCommit.commitHash, true);
          }
        } else {
          view.loadCommitDetails(commitElem);
        }
      } else {
        if (
          !expandedCommit.loading &&
          expandedCommit.fileChanges !== null &&
          expandedCommit.fileTree !== null
        ) {
          view.showCommitComparison(
            expandedCommit.commitHash,
            expandedCommit.compareWithHash,
            expandedCommit.fileChanges,
            expandedCommit.fileTree,
            expandedCommit.codeReview,
            expandedCommit.lastViewedFile,
            true
          );
          if (
            expandedCommit.commitHash === UNCOMMITTED ||
            expandedCommit.compareWithHash === UNCOMMITTED
          ) {
            view.requestCommitComparison(
              expandedCommit.commitHash,
              expandedCommit.compareWithHash,
              true
            );
          }
        } else {
          view.loadCommitComparison(commitElem, compareWithElem!);
        }
      }
    }
  }
}

function renderUncommittedChanges(view: GitGraphView) {
  const commits = view.getCommits();
  const colVisibility = getColumnVisibility(view),
    date = formatShortDate(commits[0].date);
  document.getElementById('uncommittedChanges')!.innerHTML =
    '<td></td><td><b>' +
    escapeHtml(commits[0].message) +
    '</b></td>' +
    (colVisibility.date
      ? '<td class="dateCol text" title="' + date.title + '">' + date.formatted + '</td>'
      : '') +
    (colVisibility.author ? '<td class="authorCol text" title="* <>">*</td>' : '') +
    (colVisibility.commit ? '<td class="text" title="*">*</td>' : '');
}

function renderFetchButton(view: GitGraphView) {
  alterClass(view.getControlsElem(), CLASS_FETCH_SUPPORTED, view.getGitRemotes().length > 0);
}

function renderRefreshButton(view: GitGraphView) {
  const refreshBtnElem = view.getRefreshBtnElem();
  const enabled = !view.isRefreshInProgress();
  refreshBtnElem.title = enabled ? 'Refresh' : 'Refreshing';
  refreshBtnElem.innerHTML = enabled ? SVG_ICONS.refresh : SVG_ICONS.loading;
  alterClass(refreshBtnElem, CLASS_REFRESHING, !enabled);
}

function renderTagDetails(
  view: GitGraphView,
  tagName: string,
  commitHash: string,
  details: GG.GitTagDetails
) {
  const commits = view.getCommits();
  const gitRepos = view.getGitRepos();
  const currentRepo = view.getCurrentRepo();
  const config = view.getConfig();
  const textFormatter = new TextFormatter(commits, gitRepos[currentRepo].issueLinkingConfig, {
    commits: true,
    emoji: true,
    issueLinking: true,
    markdown: config.markdown,
    multiline: true,
    urls: true
  });
  dialog.showMessage(
    'Tag <b><i>' +
      escapeHtml(tagName) +
      '</i></b><br><span class="messageContent">' +
      '<b>Object: </b>' +
      escapeHtml(details.hash) +
      '<br>' +
      '<b>Commit: </b>' +
      escapeHtml(commitHash) +
      '<br>' +
      '<b>Tagger: </b>' +
      escapeHtml(details.taggerName) +
      ' &lt;<a class="' +
      CLASS_EXTERNAL_URL +
      '" href="mailto:' +
      escapeHtml(details.taggerEmail) +
      '" tabindex="-1">' +
      escapeHtml(details.taggerEmail) +
      '</a>&gt;' +
      (details.signature !== null ? generateSignatureHtml(details.signature) : '') +
      '<br>' +
      '<b>Date: </b>' +
      formatLongDate(details.taggerDate) +
      '<br><br>' +
      textFormatter.format(details.message) +
      '</span>'
  );
}

function renderRepoDropdownOptions(view: GitGraphView, repo?: string) {
  view
    .getRepoDropdown()
    .setOptions(getRepoDropdownOptions(view.getGitRepos()), [repo || view.getCurrentRepo()]);
}

function makeTableResizable(view: GitGraphView) {
  const config = view.getConfig();
  const gitRepos = view.getGitRepos();
  const currentRepo = view.getCurrentRepo();
  const tableElem = view.getTableElem();
  const viewElem = view.getViewElem();
  const graph = view.getGraph();

  let colHeadersElem = document.getElementById('tableColHeaders')!,
    cols = <HTMLCollectionOf<HTMLElement>>document.getElementsByClassName('tableColHeader');
  let columnWidths: GG.ColumnWidth[],
    mouseX = -1,
    col = -1,
    colIndex = -1;

  const makeTableFixedLayout = () => {
    cols[0].style.width = columnWidths[0] + 'px';
    cols[0].style.padding = '';
    for (let i = 2; i < cols.length; i++) {
      cols[i].style.width = columnWidths[parseInt(cols[i].dataset.col!)] + 'px';
    }
    tableElem.className = 'fixedLayout';
    tableElem.style.removeProperty(CSS_PROP_LIMIT_GRAPH_WIDTH);
    graph.limitMaxWidth(columnWidths[0] + COLUMN_LEFT_RIGHT_PADDING);
  };

  for (let i = 0; i < cols.length; i++) {
    let col = parseInt(cols[i].dataset.col!);
    cols[i].innerHTML +=
      (i > 0 ? '<span class="resizeCol left" data-col="' + (col - 1) + '"></span>' : '') +
      (i < cols.length - 1 ? '<span class="resizeCol right" data-col="' + col + '"></span>' : '');
  }

  let cWidths = gitRepos[currentRepo].columnWidths;
  if (cWidths === null) {
    let defaults = config.defaultColumnVisibility;
    columnWidths = [
      COLUMN_AUTO,
      COLUMN_AUTO,
      defaults.date ? COLUMN_AUTO : COLUMN_HIDDEN,
      defaults.author ? COLUMN_AUTO : COLUMN_HIDDEN,
      defaults.commit ? COLUMN_AUTO : COLUMN_HIDDEN
    ];
    view.saveColumnWidths(columnWidths);
  } else {
    columnWidths = [cWidths[0], COLUMN_AUTO, cWidths[1], cWidths[2], cWidths[3]];
  }

  if (columnWidths[0] !== COLUMN_AUTO) {
    makeTableFixedLayout();
  } else {
    tableElem.className = 'autoLayout';

    let colWidth = cols[0].offsetWidth,
      graphWidth = graph.getContentWidth();
    let maxWidth = Math.round(viewElem.clientWidth * 0.333);
    if (Math.max(graphWidth, colWidth) > maxWidth) {
      graph.limitMaxWidth(maxWidth);
      graphWidth = maxWidth;
      tableElem.className += ' limitGraphWidth';
      tableElem.style.setProperty(CSS_PROP_LIMIT_GRAPH_WIDTH, maxWidth + 'px');
    } else {
      graph.limitMaxWidth(-1);
      tableElem.style.removeProperty(CSS_PROP_LIMIT_GRAPH_WIDTH);
    }

    if (colWidth < Math.max(graphWidth, 64)) {
      cols[0].style.padding =
        '6px ' +
        Math.floor((Math.max(graphWidth, 64) - (colWidth - COLUMN_LEFT_RIGHT_PADDING)) / 2) +
        'px';
    }
  }

  const processResizingColumn: EventListener = (e) => {
    if (col > -1) {
      let mouseEvent = <MouseEvent>e;
      let mouseDeltaX = mouseEvent.clientX - mouseX;

      if (col === 0) {
        if (columnWidths[0] + mouseDeltaX < COLUMN_MIN_WIDTH)
          mouseDeltaX = -columnWidths[0] + COLUMN_MIN_WIDTH;
        if (cols[1].clientWidth - COLUMN_LEFT_RIGHT_PADDING - mouseDeltaX < COLUMN_MIN_WIDTH)
          mouseDeltaX = cols[1].clientWidth - COLUMN_LEFT_RIGHT_PADDING - COLUMN_MIN_WIDTH;
        columnWidths[0] += mouseDeltaX;
        cols[0].style.width = columnWidths[0] + 'px';
        graph.limitMaxWidth(columnWidths[0] + COLUMN_LEFT_RIGHT_PADDING);
      } else {
        let colWidth =
          col !== 1 ? columnWidths[col] : cols[1].clientWidth - COLUMN_LEFT_RIGHT_PADDING;
        let nextCol = col + 1;
        while (columnWidths[nextCol] === COLUMN_HIDDEN) nextCol++;

        if (colWidth + mouseDeltaX < COLUMN_MIN_WIDTH) mouseDeltaX = -colWidth + COLUMN_MIN_WIDTH;
        if (columnWidths[nextCol] - mouseDeltaX < COLUMN_MIN_WIDTH)
          mouseDeltaX = columnWidths[nextCol] - COLUMN_MIN_WIDTH;
        if (col !== 1) {
          columnWidths[col] += mouseDeltaX;
          cols[colIndex].style.width = columnWidths[col] + 'px';
        }
        columnWidths[nextCol] -= mouseDeltaX;
        cols[colIndex + 1].style.width = columnWidths[nextCol] + 'px';
      }
      mouseX = mouseEvent.clientX;
    }
  };
  const stopResizingColumn: EventListener = () => {
    if (col > -1) {
      col = -1;
      colIndex = -1;
      mouseX = -1;
      eventOverlay.remove();
      view.saveColumnWidths(columnWidths);
    }
  };

  addListenerToClass('resizeCol', 'mousedown', (e) => {
    if (e.target === null) return;
    col = parseInt((<HTMLElement>e.target).dataset.col!);
    while (columnWidths[col] === COLUMN_HIDDEN) col--;
    mouseX = (<MouseEvent>e).clientX;

    let isAuto = columnWidths[0] === COLUMN_AUTO;
    for (let i = 0; i < cols.length; i++) {
      let curCol = parseInt(cols[i].dataset.col!);
      if (isAuto && curCol !== 1)
        columnWidths[curCol] = cols[i].clientWidth - COLUMN_LEFT_RIGHT_PADDING;
      if (curCol === col) colIndex = i;
    }
    if (isAuto) makeTableFixedLayout();
    eventOverlay.create('colResize', processResizingColumn, stopResizingColumn);
  });

  colHeadersElem.addEventListener('contextmenu', (e: MouseEvent) => {
    handledEvent(e);

    const toggleColumnState = (col: number, defaultWidth: number) => {
      columnWidths[col] =
        columnWidths[col] !== COLUMN_HIDDEN
          ? COLUMN_HIDDEN
          : columnWidths[0] === COLUMN_AUTO
            ? COLUMN_AUTO
            : defaultWidth - COLUMN_LEFT_RIGHT_PADDING;
      view.saveColumnWidths(columnWidths);
      renderView(view);
    };

    const commitOrdering = getCommitOrdering(gitRepos[currentRepo].commitOrdering);
    const changeCommitOrdering = (repoCommitOrdering: GG.RepoCommitOrdering) => {
      view.saveRepoStateValue(currentRepo, 'commitOrdering', repoCommitOrdering);
      view.refresh(true);
    };

    contextMenu.show(
      [
        [
          {
            title: 'Date',
            visible: true,
            checked: columnWidths[2] !== COLUMN_HIDDEN,
            onClick: () => toggleColumnState(2, 128)
          },
          {
            title: 'Author',
            visible: true,
            checked: columnWidths[3] !== COLUMN_HIDDEN,
            onClick: () => toggleColumnState(3, 128)
          },
          {
            title: 'Commit',
            visible: true,
            checked: columnWidths[4] !== COLUMN_HIDDEN,
            onClick: () => toggleColumnState(4, 80)
          }
        ],
        [
          {
            title: 'Commit Timestamp Order',
            visible: true,
            checked: commitOrdering === GG.CommitOrdering.Date,
            onClick: () => changeCommitOrdering(GG.RepoCommitOrdering.Date)
          },
          {
            title: 'Author Timestamp Order',
            visible: true,
            checked: commitOrdering === GG.CommitOrdering.AuthorDate,
            onClick: () => changeCommitOrdering(GG.RepoCommitOrdering.AuthorDate)
          },
          {
            title: 'Topological Order',
            visible: true,
            checked: commitOrdering === GG.CommitOrdering.Topological,
            onClick: () => changeCommitOrdering(GG.RepoCommitOrdering.Topological)
          }
        ]
      ],
      true,
      null,
      e,
      viewElem
    );
  });
}
