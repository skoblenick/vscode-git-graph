import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
	resolve: {
		alias: {
			vscode: fileURLToPath(new URL('./tests/mocks/vscode.ts', import.meta.url))
		}
	},
	test: {
		globals: true,
		include: ['tests/**/*.test.ts'],
		environment: 'node',
		coverage: {
			provider: 'v8',
			all: true,
			include: [
				'src/utils/*.ts',
				'src/*.ts'
			]
		}
	}
});
