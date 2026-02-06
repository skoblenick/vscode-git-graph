const esbuild = require('esbuild');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const production = process.argv.includes('--production');

const SRC_DIRECTORY = './src';
const OUT_DIRECTORY = './out';
const ASKPASS_DIRECTORY = 'askpass';

async function build() {
	fs.mkdirSync(path.join(OUT_DIRECTORY, ASKPASS_DIRECTORY), { recursive: true });
	fs.mkdirSync(path.join(OUT_DIRECTORY, 'life-cycle'), { recursive: true });
	fs.mkdirSync(path.join(OUT_DIRECTORY, 'utils'), { recursive: true });

	execSync('tsc -p ./src --emitDeclarationOnly', { stdio: 'inherit' });

	await esbuild.build({
		entryPoints: [
			'src/extension.ts',
			'src/askpass/askpassMain.ts',
			'src/life-cycle/uninstall.ts',
		],
		outdir: 'out',
		platform: 'node',
		format: 'cjs',
		bundle: true,
		target: 'node16',
		sourcemap: production ? false : true,
		sourcesContent: false,
		external: ['vscode'],
		minify: production,
		logLevel: 'info',
		outbase: 'src',
	});

	fs.readdirSync(path.join(SRC_DIRECTORY, ASKPASS_DIRECTORY)).forEach((fileName) => {
		if (fileName.endsWith('.sh')) {
			const scriptContents = fs.readFileSync(path.join(SRC_DIRECTORY, ASKPASS_DIRECTORY, fileName)).toString();
			fs.writeFileSync(path.join(OUT_DIRECTORY, ASKPASS_DIRECTORY, fileName), scriptContents);
		}
	});
}

build().catch((err) => {
	console.error(err);
	process.exit(1);
});
