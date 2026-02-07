export enum LifeCycleStage {
	Install,
	Update,
	Uninstall
}

export interface LifeCycleState {
	previous: {
		extension: string,
		vscode: string,
	} | null;
	current: {
		extension: string,
		vscode: string
	};
	apiAvailable: boolean;
	queue: any[];
	attempts: number;
}

export function generateNonce() {
	return '';
}

export function getDataDirectory() {
	return '';
}

export function getLifeCycleStateInDirectory(_directory: string): Promise<LifeCycleState | null> {
	return Promise.resolve(null);
}

export function saveLifeCycleStateInDirectory(_directory: string, _state: LifeCycleState): Promise<void> {
	return Promise.resolve();
}

export async function sendQueue(_queue: any[]) {
	return true;
}
