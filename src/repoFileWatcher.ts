import * as path from 'path';
import * as vscode from 'vscode';
import { Logger } from './logger';
import { getPathFromUri } from './utils';

const FILE_CHANGE_REGEX = /^\.git\/(HEAD|index|packed-refs|config|refs\/(heads|remotes|tags|stash)(\/.*)?|FETCH_HEAD|ORIG_HEAD)$/;

const WATCH_PATTERNS: string[] = [
	'.git/HEAD',
	'.git/index',
	'.git/refs/**',
	'.git/packed-refs',
	'.git/config'
];

export class RepoFileWatcher {
	private readonly logger: Logger;
	private readonly repoChangeCallback: () => void;
	private repo: string | null = null;
	private fsWatchers: vscode.FileSystemWatcher[] = [];
	private refreshTimeout: NodeJS.Timeout | null = null;
	private muted: boolean = false;
	private resumeAt: number = 0;

	constructor(logger: Logger, repoChangeCallback: () => void) {
		this.logger = logger;
		this.repoChangeCallback = repoChangeCallback;
	}

	public start(repo: string) {
		if (this.fsWatchers.length > 0) {
			this.stop();
		}

		this.repo = repo;
		for (const pattern of WATCH_PATTERNS) {
			const watcher = vscode.workspace.createFileSystemWatcher(
				new vscode.RelativePattern(repo, pattern)
			);
			watcher.onDidCreate(uri => this.refresh(uri));
			watcher.onDidChange(uri => this.refresh(uri));
			watcher.onDidDelete(uri => this.refresh(uri));
			this.fsWatchers.push(watcher);
		}
		this.logger.log('Started watching repo: ' + repo);
	}

	public stop() {
		if (this.fsWatchers.length > 0) {
			for (const watcher of this.fsWatchers) {
				watcher.dispose();
			}
			this.fsWatchers = [];
			this.logger.log('Stopped watching repo: ' + this.repo);
		}
		if (this.refreshTimeout !== null) {
			clearTimeout(this.refreshTimeout);
			this.refreshTimeout = null;
		}
	}

	public mute() {
		this.muted = true;
	}

	public unmute() {
		this.muted = false;
		this.resumeAt = (new Date()).getTime() + 1500;
	}

	private refresh(uri: vscode.Uri) {
		if (this.muted) return;
		const abs = getPathFromUri(uri);
		const rel = path.relative(this.repo!, abs).split(path.sep).join('/');
		if (!rel.match(FILE_CHANGE_REGEX)) return;
		if ((new Date()).getTime() < this.resumeAt) return;

		if (this.refreshTimeout !== null) {
			clearTimeout(this.refreshTimeout);
		}
		this.refreshTimeout = setTimeout(() => {
			this.refreshTimeout = null;
			this.repoChangeCallback();
		}, 750);
	}
}
